using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace PowerPointAddIn
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class SyracusePptCustomData
    {
        private const String sageERPX3JsonTagName   = "SyracusePptCustomData";
        private const String sageERPX3JsonTagXPath  = "//" + sageERPX3JsonTagName;

        private const String serverUrlProperty      = "serverUrl";
        private const String resourceUrlProperty    = "resourceUrl";
        private const String forceRefreshProperty   = "forceRefresh";
        private const String createModeProperty     = "createMode";
        private const String documentUrlProperty    = "documentUrl";
        private const String documentTitleProperty  = "documentTitle";
        private const String excelDataProperty      = "excelData";

        private Dictionary<String, object> dictionary;
        private Presentation pres;

        // Gets a dictionary from an word document by accessing its customxmlparts
        public static SyracusePptCustomData getFromDocument(Presentation pres, Boolean create = false)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(pres);
            if (dict != null)
            {
                return new SyracusePptCustomData(dict, pres);
            }
            if (create)
            {
                dict = new Dictionary<String, object>();
                SyracusePptCustomData cd = new SyracusePptCustomData(dict, pres);
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
        public void setCreateMode(String value)
        {
            setStringProperty(createModeProperty, value);
        }
        public String getCreateMode()
        {
            return getStringProperty(createModeProperty, false);
        }
        public void setDocumentUrl(String url)
        {
            setStringProperty(documentUrlProperty, url);
        }
        public String getDocumentUrl()
        {
            return getStringProperty(documentUrlProperty, false);
        }
        public void setDocumentTitle(String title)
        {
            setStringProperty(documentTitleProperty, title);
        }
        public String getDocumentTitle()
        {
            return getStringProperty(documentTitleProperty, false);
        }
        public String getExcelData(Boolean required = true) {
            return getStringProperty(excelDataProperty, required);
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

        public Presentation getPresentation()
        {
            return pres;
        }

        private SyracusePptCustomData(Dictionary<String, object> dictionary, Presentation pres)
        {
            this.dictionary = dictionary;
            this.pres = pres;
        }

        public void writeDictionaryToDocument()
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            String json = ser.Serialize(dictionary);

            foreach (CustomXMLPart part in pres.CustomXMLParts)
            {

                CustomXMLNode node = part.SelectSingleNode(sageERPX3JsonTagXPath);
                if (node != null)
                {
                    node.Text = json;
                    return;
                }
            }
            string xml = "<" + sageERPX3JsonTagName + ">" + json + "</" + sageERPX3JsonTagName + ">";
            pres.CustomXMLParts.Add(xml);
        }

        //Used by word
        private static Dictionary<String, object> getDictionaryFromCustomXMLPart(Presentation pres)
        {
            return getDictionaryFromCustomXMLParts(pres.CustomXMLParts);
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
