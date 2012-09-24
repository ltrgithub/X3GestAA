﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing;
using System.Data;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.Excel;
using Office = Microsoft.Office.Core;
using VB = Microsoft.Vbe.Interop;
using System.Web.Script.Serialization;
using Path = System.IO.Path;
using System.Threading;
using System.Globalization;

namespace ExcelAddIn
{
    public partial class ActionPanel : UserControl
    {
        public Boolean connected;
        //
        public ActionPanel()
        {
            connected = false;
            Thread.CurrentThread.CurrentUICulture = CultureInfo.InstalledUICulture;
            InitializeComponent();
        }

        public HtmlDocument webDocument { get { return webBrowser.Document; } }
        private void _connect(string serverUrl)
        {
            // get server url
            var connectUrl = Globals.ThisAddIn.GetServerUrl();
            //
            try
            {
                webBrowser.Url = new Uri(connectUrl + "/msoffice/lib/excel/html/main.html?url=%3Frepresentation%3Dexcelhome.%24dashboard");
                webBrowser.ObjectForScripting = new External();
                ((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
                    {
                        connected = true;
                        // actions after logon
                        // has datasources ?
                        if ((new SyracuseCustomData()).GetCustomDataByName("datasourcesAddress") == "")
                            Globals.ThisAddIn.ShowSettingsForm();
                    };
                webBrowser.Refresh();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message + "\n" + ex.StackTrace);
            }
        }

        private void buttonConnect_Click(object sender, EventArgs e)
        {
            Connect("");
        }

        public void Connect(string connectUrl)
        {
            _connect(connectUrl);
        }

        public void RefreshAll()
        {
            if (!connected)
                _connect("");
            //
            webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "refreshAll" });
        }

        private void buttonSettings_Click(object sender, EventArgs e)
        {
            Globals.ThisAddIn.ShowSettingsForm();
        }

        internal void SaveDocument()
        {
            if (!connected)
                _connect("");
            //
            webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "saveDocument" });
        }

        internal void onSelectionChange()
        {
            webBrowser.Document.InvokeScript("onOfficeEvent", new object[] { "selectionChanged" });
        }

        private void internalLoadTables(string parameters, System.Action onTablesLoaded) 
        {
            ((External)webBrowser.ObjectForScripting).onTablesLoadedHandler = onTablesLoaded;
            webBrowser.Document.InvokeScript("loadTables", new object[] { parameters });
        }
        public void loadTables(string parameters, System.Action onTablesLoaded)
        {
            if(!connected) {
                // get server url
                var connectUrl = Globals.ThisAddIn.GetServerUrl();
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
            Dictionary<string, object>[] par = new Dictionary<string,object>[2];
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
            par[1]["endpointName"] = "syracuse";
            par[1]["className"] = "groups";
            par[1]["representationName"] = "group";
            par[1]["fields"] = new object[] { "description" };
//            par[1]["parameters"] = "";
            par[1]["limit"] = -1;
            //
            JavaScriptSerializer ser = new JavaScriptSerializer();
            loadTables(ser.Serialize(par), delegate() {
                MessageBox.Show("Loaded");
            });
        }
     }
}
