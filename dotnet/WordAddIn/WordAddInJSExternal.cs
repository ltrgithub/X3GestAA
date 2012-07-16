﻿using System;
using System.IO;
using System.Collections.Generic;
using Microsoft.Office.Interop.Word;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using Microsoft.Office.Core;

// Do not rename, namespace and classname are refered in JS as WordAddIn.WordAddInJSExternal
namespace WordAddIn
{
    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class WordAddInJSExternal
    {
        private SyracuseOfficeCustomData customData;
        private DatasourceForm dialogForm;

        public WordAddInJSExternal(SyracuseOfficeCustomData customData, DatasourceForm dialogForm)
        {
            this.customData = customData;
            this.dialogForm = dialogForm;
        }

        public SyracuseOfficeCustomData getSyracuseOfficeCustomData() 
        {
            return customData;
        }

        public void closeDialogForm() 
        {
            dialogForm.Close();
        }

        private void createMailMergeDataFile(Dictionary<String, object> mailMergeData)
        {
            Document doc = customData.getWordDoc();
            Document dataDoc;

            String delim = WordAddIn.Globals.ThisAddIn.Application.International[WdInternationalIndex.wdListSeparator].ToString();

            Object[] columnInfo = (Object[])mailMergeData["columns"];
            int numberOfColumns = columnInfo.Length;
            Object[] rowData = (Object[])mailMergeData["data"];
            int numberOfRows = rowData.Length;

            String headers = "";
            
            for (int col = 0; col < numberOfColumns; col++)
            {
                Dictionary<String, Object> column = (Dictionary<String, Object>)columnInfo[col];
                String columnName = column["_name"].ToString();
                /*
                String columnType = column["_type"].ToString();
                String columnTitle = column["_title"].ToString();
                */
                if (col != 0)
                {
                    headers += delim;
                }
                headers += columnName;
            }

            string filename = System.IO.Path.GetTempFileName().Replace(".tmp", ".docx");
            doc.MailMerge.CreateDataSource(filename, Type.Missing, Type.Missing, headers);

            dataDoc = WordAddIn.Globals.ThisAddIn.Application.Documents.Open(filename);
            for (int row = 0; row < numberOfRows; row++)
            {
                if (row > 0)    // CreateDataSource has already create the first data row
                {
                    dataDoc.Tables[1].Rows.Add();
                }
                Object[] singleRowData = (Object[])rowData[row];

                int cols = singleRowData.Length;
                for (int col = 0; col < cols; col++)
                {
                    Object cellData = singleRowData[col];
                    String text = getStringValue(cellData);
                    dataDoc.Tables[1].Cell(row + 2, col + 1).Range.InsertAfter(text);
                }
            }

            dataDoc.Save();
            dataDoc.Close(false, Type.Missing, Type.Missing);
        }

        private void createMailMergeFields(Dictionary<String, object> mailMergeData)
        {
            Selection wrdSelection = WordAddIn.Globals.ThisAddIn.Application.Selection;
            Document doc = customData.getWordDoc();

            MailMergeFields wrdMergeFields = doc.MailMerge.Fields;

            Object[] columnInfo = (Object[])mailMergeData["columns"];
            int numberOfColumns = columnInfo.Length;
            for (int i = 0; i < numberOfColumns; i++)
            {
                Dictionary<String, Object> column = (Dictionary<String, Object>)columnInfo[i];
                String columnName = column["_name"].ToString();
                /*
                String columnType = column["_type"].ToString();
                String columnTitle = column["_title"].ToString();
                */
                wrdMergeFields.Add(wrdSelection.Range, columnName);
                wrdSelection.TypeParagraph();
            }
        }

        public void createDatasource(String mailMergeDataJSon)
        {
            StreamWriter sw = null;
            Document doc = customData.getWordDoc();

            try
            {
                JavaScriptSerializer ser = new JavaScriptSerializer();
                Dictionary<String, object> mailMergeData = (Dictionary<String, object>)ser.DeserializeObject(mailMergeDataJSon);

                createMailMergeDataFile(mailMergeData);

                createMailMergeFields(mailMergeData);

                String xml = null;
                CustomXMLPart match = null;
                foreach (CustomXMLPart part in doc.CustomXMLParts)
                {
                    CustomXMLNode node = part.SelectSingleNode("//SyracuseOfficeCustomData");
                    if (node != null)
                    {
                        match = part;
                        xml = part.XML;
                        break;
                    }
                }
                if (match != null)
                {
                    match.Delete();
                }

                doc.MailMerge.Destination = WdMailMergeDestination.wdSendToNewDocument;
                doc.MailMerge.Execute();

                if (xml != null)
                {
                    doc.CustomXMLParts.Add(xml);
                }
            }
            catch (Exception e)
            {
                MessageBox.Show(e.ToString() + "\n" + e.StackTrace);
            }
            finally
            {
                if (sw != null)
                {
                    try
                    {
                        sw.Flush();
                        sw.Close();
                    }
                    catch (Exception e) { };
                }
            }
        }

        private void writeCSVValue(StreamWriter sw, object cellData)
        {
            if (cellData == null)
            {
                sw.Write("");
            }
            Object value = cellData;
            if (cellData.GetType().Equals(typeof(Object[])))
            {
                value = ((Object[])cellData) [0];
            }

            String text = value.ToString();
            text = text.Replace("\"", "\"\"");

            sw.Write(text);
        }

        private string getStringValue(object cellData)
        {
            if (cellData == null)
            {
                return "";
            }
            Object value = cellData;
            if (cellData.GetType().Equals(typeof(Object[])))
            {
                value = ((Object[])cellData)[0];
            }

            String text = value.ToString();
            return text;
        }

   }
}
