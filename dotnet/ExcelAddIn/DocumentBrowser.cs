using System;
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
            string volumeUuid = "";
            // GET THE VOLUME UUID
            // make a GET http request to serverUrl + "/sdata/syracuse/collaboration/syracuse/storageVolumes?where=(code eq \"" + volumeCode + "\")"
            // the result has a $resources array, volumeUuid is the $uuid property of the first element of the result
            //
            webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/excel/html/config.html?url=" + 
                Uri.EscapeUriString("/sdata/syracuse/collaboration/syracuse/documents?representation=documentExcelSI.$lookup&where=(volume eq \"" + volumeUuid + "\")"));
            webBrowser.ObjectForScripting = new External();
            ((External)webBrowser.ObjectForScripting).onSelectRecordHandler = delegate(string prototype, string dataset)
            {
                // Test message
                MessageBox.Show("Prototype: " + prototype + "; Dataset: " + dataset);
                // GET THE CONTENT
                // documentUuid is $uuid property of dataset
                // deserialize prototype and dataset. 
                // make a GET http request to serverUrl + "/sdata/syracuse/collaboration/syracuse/documents('" + documentUuid + "')/content"
                Close();
            };
            webBrowser.Refresh();
        }
    }
}
