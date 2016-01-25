﻿using System;
using System.Collections.Generic;
using Microsoft.Office.Core;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using CommonDataHelper.GlobalHelper;

namespace ExcelAddIn
{
    public class Locale
    {
		public string name;
        public string nativeName;
        public string englishName;
    }

    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class SyracuseOfficeCustomData
    {
        private const String sageERPX3JsonTagName   = "SyracuseOfficeCustomData";
        private const String sageERPX3JsonTagXPath  = "//" + sageERPX3JsonTagName;

        private const String serverUrlProperty      = "serverUrl";
        private const String resourceUrlProperty    = "resourceUrl";
        private const String forceRefreshProperty   = "forceRefresh";
        private const String dataSourceUuidProperty = "dataSourceUuid";
        private const String createModeProperty     = "createMode";
        private const String documentUrlProperty    = "documentUrl";
        private const String documentTitleProperty  = "documentTitle";
        private const String layoutData = "layoutData";
        private const String documentRepresentationProperty = "documentRepresentation";
        private const String originalFileNameProperty       = "originalFileName";
        private const String supportedLocalesProperty = "supportedLocales";
        private const String syracuseRoleProperty = "syracuseRole";
        private const String syracuseLocaleProperty = "syracuseLocale";
        private const string docContentProperty = "docContent";

        private Dictionary<String, object> dictionary;

        private Microsoft.Office.Interop.Excel.Workbook workbook;
        private List<Locale> locales = null;

        // Gets a dictionary from an excel document by accessing its customxmlparts
        public static SyracuseOfficeCustomData getFromDocument(Microsoft.Office.Interop.Excel.Workbook workbook, Boolean create = false)
        {
            Dictionary<String, object> dict = getDictionaryFromCustomXMLPart(workbook);
            if (dict != null)
            {
                return new SyracuseOfficeCustomData(dict, workbook);
            }
            if (create)
            {
                dict = new Dictionary<String, object>();
                SyracuseOfficeCustomData cd = new SyracuseOfficeCustomData(dict, workbook);
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
        public void setSyracuseRole(String value)
        {
            setStringProperty(syracuseRoleProperty, value);
        }
        public string getSyracuseRole()
        {
            return getStringProperty(syracuseRoleProperty, false);
        }
        public void setSyracuseLocale(String value)
        {
            setStringProperty(syracuseLocaleProperty, value);
        }
        public string getSyracuseLocale()
        {
            return getStringProperty(syracuseLocaleProperty, false);
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
        public String getDocContent()
        {
            return getStringProperty(docContentProperty, false);
        }
        public void setDocContent(String c)
        {
            //setStringProperty(docContentProperty, c);
        }
        public void setDocumentTitle(String title)
        {
            setStringProperty(documentTitleProperty, title);
        }
        public String getDocumentTitle()
        {
            return getStringProperty(documentTitleProperty, false);
        }
        public void setLayoutData(String data)
        {
            setStringProperty(layoutData, data);
        }
        public String getLayoutData()
        {
            return getStringProperty(layoutData, false);
        }
        public string getDocumentRepresentation()
        {
            return getStringProperty(documentRepresentationProperty, false);
        }
        public string getOriginalFileName()
        {
            return getStringProperty(originalFileNameProperty, false);
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

            SageJsonSerializer ser = new SageJsonSerializer();
            jsonData = ser.Serialize(dictionary);

            MessageBox.Show(jsonData);
        }

        public Dictionary<String, object> getDictionary()
        {
            return this.dictionary;
        }

        public void setDictionary(Dictionary<String, object> d)
        {
            this.dictionary = d;
        }

        public Microsoft.Office.Interop.Excel.Workbook getExcelWorkbook()
        {
            return workbook;
        }

        private SyracuseOfficeCustomData(Dictionary<String, object> dictionary, Microsoft.Office.Interop.Excel.Workbook workbook)
        {
            this.dictionary = dictionary;
            this.workbook = workbook;
        }

        public void writeDictionaryToDocument()
        {
            SageJsonSerializer ser = new SageJsonSerializer();
            String json = ser.Serialize(dictionary);

            foreach (CustomXMLPart part in workbook.CustomXMLParts)
            {

                CustomXMLNode node = part.SelectSingleNode(sageERPX3JsonTagXPath);
                if (node != null)
                {
                    node.Text = json;
                    return;
                }
            }
            string xml = "<" + sageERPX3JsonTagName + ">" + json + "</" + sageERPX3JsonTagName + ">";
            workbook.CustomXMLParts.Add(xml);
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
                    SageJsonSerializer ser = new SageJsonSerializer();
                    return (Dictionary<String, object>) ser.DeserializeObject(node.Text);
                }
            }
            return null;
        }

        public List<Locale> getSupportedLocales()
        {
            List<Locale> ret = new List<Locale>();

            if (locales != null)
                return locales;
            try
            {
                object[] o = (object[])dictionary[supportedLocalesProperty];
                foreach (Object l in o)
                {
                    Dictionary<String, Object> locale = (Dictionary<String, Object>)l;
                    Locale loc = new Locale();
                    try
                    {
                        loc.name = locale["name"].ToString();
                        loc.nativeName = locale["nativeName"].ToString();
                        loc.englishName = locale["englishName"].ToString();
                    }
                    catch (Exception) { };
                    ret.Add(loc);
                }
            }
            catch (Exception)
            {
                return ret;
            }

            locales = ret;
            return ret;
        }
    }
}
