using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Threading;
using System.IO;
using System.Net;


namespace CommonDialogs.CredentialsDialog
{
    public partial class CredentialsDialog : Form, ICredentialsDialog
    {
        public CredentialsDialog()
        {
            InitializeComponent();
            textBoxUserName.Select();
        }

        private NetworkCredential _credentials = null;
        public NetworkCredential Credentials
        {
            get { return _credentials; }
            set { _credentials = value; }
        }

        private void btnOk_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(textBoxUserName.Text))
            {
                this.DialogResult = DialogResult.None;
            }
            else
            {
                Credentials = new NetworkCredential(textBoxUserName.Text, textBoxPassword.Text);
            }
        }

        private void textBoxUserName_TextChanged(object sender, EventArgs e)
        {
            btnOk.Enabled = !string.IsNullOrEmpty(textBoxUserName.Text);
        }
    }
}
