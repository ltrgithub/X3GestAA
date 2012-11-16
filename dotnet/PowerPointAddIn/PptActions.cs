using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Interop.Excel;
using System.Windows.Forms;
using System.Web.Script.Serialization;

namespace PowerPointAddIn
{
    public class PptActions
    {
        public BrowserDialog browserDialog = null;
        private JavaScriptSerializer ser = new JavaScriptSerializer();

        public PptActions(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        public void addChartSlide(Presentation pres, DocumentWindow win, PptCustomData cd)
        {
            try
            {
                int idx = 0;
                try
                {
                    idx = win.View.Slide.SlideIndex;
                }
                catch (Exception) { };

                Slide sl = pres.Slides.Add(idx + 1, PpSlideLayout.ppLayoutChart);

                Microsoft.Office.Interop.PowerPoint.Shape sh = sl.Shapes.AddChart(Microsoft.Office.Core.XlChartType.xl3DColumn);
                Microsoft.Office.Interop.PowerPoint.Chart c = sh.Chart;

                c.ChartData.Activate();
                Workbook wb = (Workbook)c.ChartData.Workbook;

                cd.setActionType("ppt_populate_worksheet");

                PptCustomXlsData xcd = PptCustomXlsData.getFromDocument(wb, true);
                xcd.setServerUrl(cd.getServerUrl());
                xcd.setResourceUrl(cd.getResourceUrl());
                xcd.setForceRefresh(false);
                xcd.writeDictionaryToDocument();
                xcd.setChart(c);
                browserDialog.loadPage("/msoffice/lib/ppt/ui/main.html?url=%3Frepresentation%3Dppthome.%24dashboard", cd, xcd);
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + ":" + e.StackTrace);
            }
        }

        public void addDataToWorksheet(Presentation pres, PptCustomXlsData customXlsData, String jsonData)
        {
            Workbook wb = customXlsData.getWorkbook();
            Worksheet ws = wb.Sheets[1];

            Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(jsonData);
            Object[] listData = (Object[]) data["$data"];
            Object[] columns =  (Object[]) data["$columns"];

            // get paging infos
            int startIndex = Convert.ToInt32(data["$startIndex"]);
            int totalResults = Convert.ToInt32(data["$totalResults"]);
            int itemsPerPage = Convert.ToInt32(data["$itemsPerPage"]);
            bool isFirstPage = Convert.ToBoolean(data["$isFirstPage"]);
            bool isLastPage = Convert.ToBoolean(data["$isLastPage"]);

            // first chunk of data, clear xls sheet
            if (isFirstPage)
            {
                ws.Cells.Clear();
                addHeadersToWorksheet(pres, wb, ws, customXlsData, columns);
            }
            int[] dataToDisplayIndex = customXlsData.getColumnMapping();

            int row = startIndex;
            foreach (Object rowData in listData)
            {
                Object[] rowDataArray = (Object[])rowData;
                row++;
                int columnIndex = 0;
                int displayIndex;
                foreach (Object column in rowDataArray)
                {
                    Dictionary<String, object> colDataCol = (Dictionary<String, object>)column;
                    if (columnIndex < dataToDisplayIndex.Length)
                    {
                        displayIndex = dataToDisplayIndex[columnIndex];
                        if (displayIndex > 0)
                        {
                            ws.Cells[row, displayIndex].Value = colDataCol["value"].ToString();
                        }
                    }
                    columnIndex++;
                }
            }

//            writeFile("c:\\temp\\data.txt", jsonData);
            if (isLastPage)
            {
                addingDataFinished(pres, customXlsData);
            }
        }

        private void addHeadersToWorksheet(Presentation pres, Workbook wb, Worksheet ws, PptCustomXlsData customXlsData, Object[] columns)
        {
            int col = 0;
            int dcol = 0;
            int[] dataToDisplayIndex = new int[columns.Length];

            foreach (Object column in columns)
            {
                Dictionary<String, object> dictCol = (Dictionary<String, object>) column;
                dataToDisplayIndex[col] = 0;
                string _orgName = dictCol["_orgName"].ToString();
                if (!_orgName.StartsWith("$"))
                {
                    dcol++;
                    dataToDisplayIndex[col] = dcol;
                    string _title = dictCol["_title"].ToString();
                    string _type = dictCol["_type"].ToString();
                    ws.Cells[1, dcol].Value = _title;
                }
                col++;
            }
            customXlsData.setColumnMapping(dataToDisplayIndex);
        }

        private void addingDataFinished(Presentation pres, PptCustomXlsData customXlsData)
        {
            Workbook wb = customXlsData.getWorkbook();
            Worksheet ws = wb.Sheets[1];
            Microsoft.Office.Interop.PowerPoint.Chart chart = customXlsData.getChart();
            chart.Refresh();

            browserDialog.Visible = false;
        }

        // Helper for debugging
        private static void writeFile(string fileName, string text)
        {
            System.IO.StreamWriter file = new System.IO.StreamWriter(fileName);
            file.WriteLine(text);
            file.Close();
        }
    }
}
