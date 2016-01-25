using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Office.Interop.Excel;
using CommonDataHelper.GlobalHelper;

namespace PowerPointAddIn
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class PptCustomXlsData
    {
        private const String sageERPX3JsonTagName   = "SyracusePptCustomData";
        private const String sageERPX3JsonTagXPath  = "//" + sageERPX3JsonTagName;

        private const String serverUrlProperty      = "serverUrl";
        private const String resourceUrlProperty    = "resourceUrl";
        private const String forceRefreshProperty   = "forceRefresh";

        private Dictionary<String, object> dictionary;
        private Workbook wb;
        private Microsoft.Office.Interop.PowerPoint.Chart chart;
        private TableInfo tableInfo;

        // Gets a dictionary from an word document by accessing its customxmlparts
        public static PptCustomXlsData getFromDocument(Workbook wb, Boolean create = false)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(wb);
            if (dict != null)
            {
                return new PptCustomXlsData(dict, wb);
            }
            if (create)
            {
                dict = new Dictionary<String, object>();
                PptCustomXlsData cd = new PptCustomXlsData(dict, wb);
                cd.writeDictionaryToDocument();
                return cd;
            }
            return null;
        }
        public void setServerUrl(string url)
        {
            setStringProperty(serverUrlProperty, url);
        }
        public string getServerUrl() 
        {
            return getStringProperty(serverUrlProperty);
        }
        public void setResourceUrl(String value)
        {
            setStringProperty(resourceUrlProperty, value);
        }
        public string getResourceUrl()
        {
            return getStringProperty(resourceUrlProperty, false);
        }
        public void setForceRefresh(Boolean status)
        {
            setBooleanValue(forceRefreshProperty, status);
        }
        public Boolean isForceRefresh()
        {
            return getBooleanProperty(forceRefreshProperty, false);
        }
        public void setBooleanValue(String name, Boolean status)
        {
            dictionary[forceRefreshProperty] = (status ? "1" : "0");
        }
        public Boolean getBooleanProperty(String name, Boolean required = true)
        {
            Boolean r = false;
            try
            {
                if (getStringProperty(name, required).Equals("1"))
                {
                    r = true;
                }
                else
                {
                    r = false;
                }
            }
            catch (Exception e)
            {
                MessageBox.Show(e.ToString());
            }
            return r;
        }
        public void setStringProperty(String name, String value)
        {
            dictionary[name] = value;
        }
        public string getStringProperty(String name, Boolean required = true)
        {
            try
            {
                object o = dictionary[name];
                if (o == null && required)
                {
                    MessageBox.Show(name + " is null!");
                    return "";
                }
                return o.ToString();
            }
            catch (KeyNotFoundException)
            {
                if (required)
                {
                    MessageBox.Show(name + " is not set!");
                }
                return "";
            }
        }
        public Dictionary<String, object> getDictionary()
        {
            return this.dictionary;
        }

        public void setDictionary(Dictionary<String, object> d)
        {
            this.dictionary = d;
        }

        public Workbook getWorkbook()
        {
            return wb;
        }
        public Microsoft.Office.Interop.PowerPoint.Chart getChart()
        {
            return chart;
        }
        public void setChart(Microsoft.Office.Interop.PowerPoint.Chart chart)
        {
            this.chart = chart;
        }
        public TableInfo getTableInfo()
        {
            return tableInfo;
        }
        public void setTableInfo(TableInfo ti)
        {
            tableInfo = ti;
        }
        public void setWorkbook(Workbook wb)
        {
            this.wb = null;
        }
        private PptCustomXlsData(Dictionary<String, object> dictionary, Workbook wb)
        {
            this.dictionary = dictionary;
            this.wb = wb;
        }
        public void writeDictionaryToDocument()
        {
            SageJsonSerializer ser = new SageJsonSerializer();
            String json = ser.Serialize(dictionary);

            foreach (CustomXMLPart part in wb.CustomXMLParts)
            {

                CustomXMLNode node = part.SelectSingleNode(sageERPX3JsonTagXPath);
                if (node != null)
                {
                    node.Text = json;
                    return;
                }
            }
            string xml = "<" + sageERPX3JsonTagName + ">" + json + "</" + sageERPX3JsonTagName + ">";
            wb.CustomXMLParts.Add(xml);
        }

        //Used by word
        private static Dictionary<String, object> getDictionaryFromCustomXMLPart(Workbook wb)
        {
            return getDictionaryFromCustomXMLParts(wb.CustomXMLParts);
        }

        private static Dictionary<String, object> getDictionaryFromCustomXMLParts(CustomXMLParts parts)
        {
            foreach (CustomXMLPart part in parts)
            {
                CustomXMLNode node = part.SelectSingleNode(sageERPX3JsonTagXPath);
                if (node != null)
                {
                    SageJsonSerializer ser = new SageJsonSerializer();
                    return (Dictionary<String, object>) ser.DeserializeObject(node.Text);
                }
            }
            return null;
        }
    }
}
