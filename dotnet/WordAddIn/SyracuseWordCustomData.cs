using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Core;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace WordAddIn
{
    class SyracuseOfficeCustomData
    {
        private const String sageERPX3JsonTagXPath = "/SyracuseOfficeCustomData";

        private Dictionary<String, object> dictionary;

        // Gets a dictionary from an word document by accessing its customxmlparts
        public static SyracuseOfficeCustomData getFromDocument(Microsoft.Office.Interop.Word.Document doc)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(doc);
            if (dict == null)
            {
                return null;
            }

            return new SyracuseOfficeCustomData(dict);
        }

        // Gets a dictionary from an excel document by accessing its customxmlparts
        public static SyracuseOfficeCustomData getFromDocument(Microsoft.Office.Interop.Excel.Workbook doc)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(doc);
            if (dict == null)
            {
                return null;
            }
            return new SyracuseOfficeCustomData(dict);
        }

        public string getServerURL() {
            return dictionary["serverUrl"].ToString();
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

        private SyracuseOfficeCustomData(Dictionary<String, object> dictionary)
        {
            this.dictionary = dictionary;
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
