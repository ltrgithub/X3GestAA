using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CommonDataHelper
{
    public partial class ConnectionDialog : Form
    {
        public ConnectionDialog()
        {
            InitializeComponent();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                Hide();
            }
            base.OnFormClosing(e);
        }

        public bool connectToServer(Uri url)
        {
            Text = url.ToString();

            webBrowser.Url = url;
            if (webBrowser.Document != null)
            {
            }

            /*
             * We need this to be synchronous...
             */
            while (webBrowser.ReadyState != WebBrowserReadyState.Complete)
                Application.DoEvents();

            /*
             * In the absence of an http response code, we'll check against the document title.
             */
            return string.IsNullOrEmpty(webBrowser.DocumentTitle) == false && webBrowser.DocumentTitle.Equals("Syracuse");
        }
    }
}
