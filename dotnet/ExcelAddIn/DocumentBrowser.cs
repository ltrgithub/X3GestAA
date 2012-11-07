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
    public partial class DocumentBrowser : Form
    {
        public DocumentBrowser()
        {
            InitializeComponent();
        }
        //
        public void SelectDocument(String serverUrl, String volumeCode)
        {
            webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/excel/html/config.html?url=" + 
                Uri.EscapeUriString("/sdata/syracuse/collaboration/syracuse/documents?representation=documentExcelSI.$lookup&volumeCode=" + volumeCode));
            webBrowser.ObjectForScripting = new External();
            // not sure we need to connect the action panel on this operation
            /*((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
            {
                if (!Globals.ThisAddIn.ActionPanel.connected)
                    Globals.ThisAddIn.ActionPanel.Connect("");
            };*/
            ((External)webBrowser.ObjectForScripting).onSelectRecordHandler = delegate(string prototype, string dataset)
            {
                MessageBox.Show("Prototype: " + prototype + "; Dataset: " + dataset);
                Close();
            };
            webBrowser.Refresh();
        }
    }
}
