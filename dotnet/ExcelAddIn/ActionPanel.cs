using System;
using System.Collections.Generic;
using System.Windows.Forms;
using Excel = Microsoft.Office.Interop.Excel;
using Office = Microsoft.Office.Core;
using VB = Microsoft.Vbe.Interop;
using System.Web.Script.Serialization;
using System.Threading;
using System.Globalization;
using Microsoft.Win32;

namespace ExcelAddIn
{
    public partial class ActionPanel : UserControl
    {
        public Boolean connected;
        //
        public ActionPanel()
        {
            connected = false;
            setLanguage();
            InitializeComponent();
        }

        // Equal function for Excel / Word / Powerpoint
        private void setLanguage()
        {
            int languageCode = 0;
            const string keyEntry = "UILanguage";
            // 15.0 Office 2013
            // 14.0 2010
            // 12.0 2003
            string[] versions = { "15.0", "14.0", "12.0" };
            foreach (string version in versions)
            {
                string reg = @"Software\Microsoft\Office\" + version + "\\Common\\LanguageResources";
                try
                {
                    RegistryKey k = Registry.CurrentUser.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageCode = (int)k.GetValue(keyEntry);

                }
                catch { }

                try
                {
                    RegistryKey k = Registry.LocalMachine.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageCode = (int)k.GetValue(keyEntry);
                }
                catch { }

                if (languageCode > 0)
                {
                    break;
                }
            }

            if (languageCode > 0)
            {
                Thread.CurrentThread.CurrentUICulture = new CultureInfo(languageCode);
            }
            else
            {
                Thread.CurrentThread.CurrentUICulture = CultureInfo.InstalledUICulture;
            }
        }

        public HtmlDocument webDocument { get { return webBrowser.Document; } }
        private void _connect(string serverUrl, bool withSettings = true, Excel.Workbook Wb = null)
        {
            // get server url
            var connectUrl = serverUrl;
            if (connectUrl == "") connectUrl = Globals.ThisAddIn.GetServerUrl(Wb);
            if (connectUrl == "") return;
            //
            try
            {
                webBrowser.ObjectForScripting = new External();
                webBrowser.DocumentCompleted += new WebBrowserDocumentCompletedEventHandler(webBrowser_DocumentCompleted);
                ((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
                    {
                        connected = true;
                        // actions after logon
                        // has datasources ?
                        Excel.Workbook thisWb = Wb != null ? Wb : Globals.ThisAddIn.Application.ActiveWorkbook;
                        if (withSettings && ((new SyracuseCustomData(Wb)).GetCustomDataByName("datasourcesAddress") == ""))
                            Globals.ThisAddIn.ShowSettingsForm();
                    };
                webBrowser.Url = new Uri(connectUrl + "/msoffice/lib/excel/html/main.html?url=%3Frepresentation%3Dexcelhome.%24dashboard");
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message + "\n" + ex.StackTrace);
            }
        }

        private void webBrowser_DocumentCompleted(object sender, WebBrowserDocumentCompletedEventArgs e)
        {
            HtmlDocument doc = ((WebBrowser)sender).Document;
            String title = doc.GetElementsByTagName("title")[0].InnerText;

            /*
             * Under certain circumstances, the document title is different from that contained in the document text.
             * We therefore need to test for both if the title is not equal to Syracuse.
             */
            if (!(title != null && (title.Equals("Syracuse") || ((WebBrowser)sender).DocumentText.Contains("<title>Syracuse</title>"))))
            {
                CommonUtils.ShowInfoMessage(global::ExcelAddIn.Properties.Resources.MSG_INVALID_SERVER_URL, global::ExcelAddIn.Properties.Resources.MSG_INVALID_SERVER_URL_TITLE);
            }

            /*
             * Remove the event handler to avoid multiple invocations of the delegate method.
             */
            webBrowser.DocumentCompleted -= new WebBrowserDocumentCompletedEventHandler(webBrowser_DocumentCompleted);
        }

        public void Connect(string connectUrl, bool withSettings = true, Excel.Workbook Wb = null)
        {
            _connect(connectUrl, withSettings, Wb);
        }

        public void RefreshAll()
        {
            if (!connected)
                _connect("");

            webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "refreshAll" });
        }

        internal void SaveDocument()
        {
            if (!connected)
                _connect("");
            if (webBrowser.Document != null)
                webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "saveDocument" });
        }

        internal void onSelectionChange()
        {
            if (webBrowser.Document != null)
                webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "selectionChanged" });
        }

        private void internalLoadTables(string parameters, ExcelAddIn.External.TablesLoadedCallback onTablesLoaded) 
        {
            ((External)webBrowser.ObjectForScripting).onTablesLoadedHandler = onTablesLoaded;
            webBrowser.Document.InvokeScript("loadTables", new object[] { parameters });
        }
        public void loadTables(string parameters, ExcelAddIn.External.TablesLoadedCallback onTablesLoaded)
        {
            if(!connected) {
                // get server url
                var connectUrl = Globals.ThisAddIn.GetServerUrl(Globals.ThisAddIn.Application.ActiveWorkbook);
                //
                webBrowser.Url = new Uri(connectUrl + "/msoffice/lib/excel/html/main.html?url=%3Frepresentation%3Dexcelhome.%24dashboard");
                webBrowser.ObjectForScripting = new External();
                ((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
                {
                    connected = true;
                    // actions after logon
                    internalLoadTables(parameters, onTablesLoaded);
                };
                webBrowser.Refresh();
            } 
            else 
            {
                // TODO: make sure it's connected to the same server !!!
                internalLoadTables(parameters, onTablesLoaded);
            }
        }

        private void button1_Click(object sender, EventArgs e)
        {
            Dictionary<string, object>[] par = new Dictionary<string,object>[3];
            par[0] = new Dictionary<string,object>();
            par[0]["dsName"] = "users_1";
            par[0]["cellAddress"] = "A1";
            par[0]["endpointName"] = "syracuse";
            par[0]["className"] = "users";
            par[0]["representationName"] = "user";
            par[0]["fields"] = new object[] {"login", "firstName", "lastName"};
            par[0]["parameters"] = "where=(login eq \"guest\")";
            par[0]["limit"] = -1;
            //
            par[1] = new Dictionary<string, object>();
            par[1]["dsName"] = "groups_1";
            par[1]["cellAddress"] = "A4";
            par[1]["endpointName"] = "syracuse_";
            par[1]["className"] = "groups";
            par[1]["representationName"] = "group";
            par[1]["fields"] = new object[] { "description" };
//            par[1]["parameters"] = "";
            par[1]["limit"] = -1;
            //
            JavaScriptSerializer ser = new JavaScriptSerializer();
            loadTables(ser.Serialize(par), delegate(string errorMessage) {
                if (errorMessage == "")
                    MessageBox.Show("Loaded");
                else
                    MessageBox.Show("Load Error: " + errorMessage);
            });
        }

        public void updateAddin()
        {
            MessageBox.Show(global::ExcelAddIn.Properties.Resources.MSG_RESTART, global::ExcelAddIn.Properties.Resources.MSG_RESTART_TITLE);
            webBrowser.ObjectForScripting = new External();
            var connectUrl = Globals.ThisAddIn.GetServerUrl(Globals.ThisAddIn.Application.ActiveWorkbook);
            try
            {
                webBrowser.Url = new Uri(connectUrl + "/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE");
            }
            catch (Exception e) { MessageBox.Show(e.Message); }
            Globals.Ribbons.Ribbon.buttonUpdate.Enabled = false;
            Globals.Ribbons.Ribbon.buttonUpdate.Enabled = false;
        }
    }
}
