using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using CommonDataHelper;
using Microsoft.Office.Interop.Excel;
using System.IO;
using CommonDataHelper.UtilityHelper;


namespace PowerPointAddIn
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class SyracuseOfficeCustomData : ISyracuseOfficeCustomData
    {
        private const String sageERPX3JsonTagName   = "SyracusePptCustomData";
        private const String sageERPX3JsonTagXPath  = "//" + sageERPX3JsonTagName;

        private const String serverUrlProperty      = "serverUrl";
        private const String resourceUrlProperty    = "resourceUrl";
        private const String forceRefreshProperty   = "forceRefresh";
        private const String actionTypeProperty     = "actionType";
        private const String documentUrlProperty    = "documentUrl";
        private const String documentTitleProperty  = "documentTitle";
        private const string publishedDocumentJsonProperty = "publishedDocumentJson";

        private Dictionary<String, object> dictionary;
        private Presentation pres;
        private List<Microsoft.Office.Interop.PowerPoint.Chart> chartsArray;

        // Gets a dictionary from an word document by accessing its customxmlparts
        public static SyracuseOfficeCustomData getFromDocument(Presentation pres, Boolean create = false)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(pres);
            if (dict != null)
            {
                return new SyracuseOfficeCustomData(dict, pres);
            }
            if (create)
            {
                dict = new Dictionary<String, object>();
                SyracuseOfficeCustomData cd = new SyracuseOfficeCustomData(dict, pres);
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
            return getStringProperty(serverUrlProperty, false);
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
        public void setActionType(String value)
        {
            setStringProperty(actionTypeProperty, value);
        }
        public String getActionType()
        {
            return getStringProperty(actionTypeProperty, false);
        }

        public string getPublishedDocumentJson()
        {
            return getStringProperty(publishedDocumentJsonProperty, false);
        }
        public void setPublishedDocumentJson(string publishedDocumentJson)
        {
            setStringProperty(publishedDocumentJsonProperty, publishedDocumentJson);
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
        public void setCharts(List<Microsoft.Office.Interop.PowerPoint.Chart> charts)
        {
            chartsArray = charts;
        }
        public List<Microsoft.Office.Interop.PowerPoint.Chart> getCharts()
        {
            return chartsArray;
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

        private SyracuseOfficeCustomData(Dictionary<String, object> dictionary, Presentation pres)
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


        public byte[] GetDocumentContent()
        {
            Presentation pres = Globals.PowerPointAddIn.Application.ActiveWindow.Presentation;
            //PptCustomData customData = PptCustomData.getFromDocument(pres, true);
            //Presentation pres = (customData != null) ? customData.getPresentation() : null; // this.doc;
            if (pres == null)
            {
                CommonUtils.ShowErrorMessage(global::PowerPointAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return null;
            }

            String tempFileName = Path.GetTempFileName();
            pres.SaveCopyAs(tempFileName);
            byte[] content = System.IO.File.ReadAllBytes(tempFileName);
            String base64string = Convert.ToBase64String(content);
            pres.Save();
            return System.Text.Encoding.UTF8.GetBytes(EncodingHelper.rawDecode(base64string));
        }



        public void setDocumentUrlAddress(string url)
        {
        }

        public void setDocumentTitleAddress(string title)
        {
        }

        public string getDocumentRepresentation()
        {
            return String.Empty;
        }
    }
}
