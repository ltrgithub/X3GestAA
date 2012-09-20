using System;
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
                        // actions after logon
                        // has datasources ?
                        if ((new SyracuseCustomData()).GetCustomDataByName("datasourcesAddress") == "")
                            Globals.ThisAddIn.ShowSettingsForm();
                    };
                webBrowser.Refresh();
                connected = true;
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

     }
}
