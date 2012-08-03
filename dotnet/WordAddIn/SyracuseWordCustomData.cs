using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Core;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace WordAddIn
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class SyracuseOfficeCustomData
    {
        private const String sageERPX3JsonTagXPath = "//SyracuseOfficeCustomData";

        private const String serverUrlProperty      = "serverUrl";
        private const String resourceUrlProperty    = "resourceUrl";
        private const String forceRefreshProperty   = "forceRefresh";
        private const String dataSourceUuidProperty = "dataSourceUuid";
        private const String createModeProperty     = "createMode";

        private Dictionary<String, object> dictionary;

        private Microsoft.Office.Interop.Word.Document doc;
        private Microsoft.Office.Interop.Excel.Workbook workbook;

        // Gets a dictionary from an word document by accessing its customxmlparts
        public static SyracuseOfficeCustomData getFromDocument(Microsoft.Office.Interop.Word.Document doc, Boolean create = false)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(doc);
            if (dict != null)
            {
                return new SyracuseOfficeCustomData(dict, doc);
            }
            if (create)
            {
                dict = new Dictionary<String, object>();
                SyracuseOfficeCustomData cd = new SyracuseOfficeCustomData(dict, doc);
                cd.writeDictionaryToDocument();
                return cd;
            }
            return null;
        }

        // Gets a dictionary from an excel document by accessing its customxmlparts
        public static SyracuseOfficeCustomData getFromDocument(Microsoft.Office.Interop.Excel.Workbook doc)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(doc);
            if (dict == null)
            {
                return null;
            }
            return new SyracuseOfficeCustomData(dict, doc);
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
        public void setCreateMode(String value)
        {
            setStringProperty(createModeProperty, value);
        }
        public String getCreateMode()
        {
            return getStringProperty(createModeProperty);
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
                if (getStringProperty(forceRefreshProperty, required).Equals("1"))
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

        public void debug() 
        {
            string jsonData;

            JavaScriptSerializer ser = new JavaScriptSerializer();
            jsonData = ser.Serialize(dictionary);

            MessageBox.Show(jsonData);
        }

        public Dictionary<String, object> getDictionary()
        {
            return this.dictionary;
        }

        public Microsoft.Office.Interop.Word.Document getWordDoc()
        {
            return doc;
        }

        private SyracuseOfficeCustomData(Dictionary<String, object> dictionary, Microsoft.Office.Interop.Word.Document doc)
        {
            this.dictionary = dictionary;
            this.doc = doc;
        }

        private SyracuseOfficeCustomData(Dictionary<String, object> dictionary, Microsoft.Office.Interop.Excel.Workbook workbook)
        {
            this.dictionary = dictionary;
            this.workbook = workbook;
        }

        public void writeDictionaryToDocument()
        {
            foreach (CustomXMLPart part in doc.CustomXMLParts)
            {

                CustomXMLNode node = part.SelectSingleNode(sageERPX3JsonTagXPath);
                if (node != null)
                {
                    JavaScriptSerializer ser = new JavaScriptSerializer();
                    node.Text = ser.Serialize(dictionary);
                }
            }
        }

        //Used by word
        private static Dictionary<String, object> getDictionaryFromCustomXMLPart(Microsoft.Office.Interop.Word.Document doc)
        {
            return getDictionaryFromCustomXMLParts(doc.CustomXMLParts);
        }

        //Used by exel (maybe someday)
        private static Dictionary<String, object> getDictionaryFromCustomXMLPart(Microsoft.Office.Interop.Excel.Workbook doc)
        {
            return getDictionaryFromCustomXMLParts(doc.CustomXMLParts);
        }

        private static Dictionary<String, object> getDictionaryFromCustomXMLParts(CustomXMLParts parts)
        {
            foreach (CustomXMLPart part in parts)
            {
                CustomXMLNode node = part.SelectSingleNode(sageERPX3JsonTagXPath);
                if (node != null)
                {
                    JavaScriptSerializer ser = new JavaScriptSerializer();
                    return (Dictionary<String, object>) ser.DeserializeObject(node.Text);
                }
            }
            return null;
        }
    }
}
