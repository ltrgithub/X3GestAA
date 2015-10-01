using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace WordAddIn
{
    public partial class DatasourceForm : Form
    {
        private SyracuseOfficeCustomData customData;

        public DatasourceForm(SyracuseOfficeCustomData customData)
        { 
            this.customData = customData;
            InitializeComponent(); 
        }

        private void DatasourceForm_Load(object sender, EventArgs e)
        {
            try
            {
                Uri uri = new Uri(customData.getServerUrl() + "/msoffice/lib/word/html/main.html?url=%3Frepresentation%3Dword.%24query");
                browser.ObjectForScripting = new WordAddInJSExternal(customData, this);
                browser.Url = uri;
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString());
            }
        }

        private void webBrowser1_DocumentCompleted(object sender, WebBrowserDocumentCompletedEventArgs e)
        {

        }
    }
}
