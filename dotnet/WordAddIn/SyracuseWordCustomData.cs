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
        private String serverUrlProperty = "serverUrl";
        private String resourceUrlProperty = "resourceUrl";

        private Dictionary<String, object> dictionary;

        private Microsoft.Office.Interop.Word.Document doc;
        private Microsoft.Office.Interop.Excel.Workbook workbook;

        // Gets a dictionary from an word document by accessing its customxmlparts
        public static SyracuseOfficeCustomData getFromDocument(Microsoft.Office.Interop.Word.Document doc)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(doc);
            if (dict == null)
            {
                return null;
            }

            return new SyracuseOfficeCustomData(dict, doc);
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

        public string getResourceUrl()
        {
            return getStringProperty(resourceUrlProperty);
        }

        public string getStringProperty(String name)
        {
            object o = dictionary[name];
            if (o == null)
            {
                MessageBox.Show(name + " is null!");
                return "";
            }
            return o.ToString();
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
