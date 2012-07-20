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
    public partial class BrowserDialog : Form
    {
        public string serverUrl;

        public BrowserDialog()
        {
            InitializeComponent();
        }

        public void connect(String serverUrl)
        {
            this.webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/word/html/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");
            this.serverUrl = serverUrl;
        }

        public void createMailMerge()
        {
            this.webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/word/html/main.html?url=%3Frepresentation%3Dmailmergeds.%24dashboard");
        }
    }
}
