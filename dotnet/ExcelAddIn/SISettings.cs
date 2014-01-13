using System;
using System.Windows.Forms;

namespace ExcelAddIn
{
    public partial class SISettings : Form
    {
        public SISettings()
        {
            InitializeComponent();
        }
        public void Connect(String serverUrl)
        {
            webBrowser.ObjectForScripting = new External();
            ((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
            {
                if (!Globals.ThisAddIn.ActionPanel.connected)
                    Globals.ThisAddIn.ActionPanel.Connect(serverUrl, false);
            };
            ((External)webBrowser.ObjectForScripting).onTablesLoadedHandler = delegate(string errorMessage)
            {
                if (errorMessage == "")
                    MessageBox.Show("Loaded");
                else
                    MessageBox.Show("Load Error: " + errorMessage);
            };
            webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/excel/html/config.html?url=" +
                Uri.EscapeUriString("excel://excelSIParams('{documentId}')?representation=excelSIParam.$edit"));
        }
    }
}
