using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace ExcelAddIn
{
    public partial class DatasourceMngtForm : Form
    {
        public DatasourceMngtForm()
        {
            InitializeComponent();
        }
        //
        public void Connect(String serverUrl)
        {
            webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/excel/html/config.html?url=%3Frepresentation%3Dexcelconfig.%24dashboard");
            webBrowser.ObjectForScripting = new External();
            ((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
            {
                if(!Globals.ThisAddIn.ActionPanel.connected)
                 Globals.ThisAddIn.ActionPanel.Connect("");
            };
            webBrowser.Refresh();
        }

        private void DatasourceMngtForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            Globals.ThisAddIn.SettingsFormDestroyed();
        }

        internal void RefreshBrowser()
        {
            webBrowser.Refresh();
        }
    }
}
