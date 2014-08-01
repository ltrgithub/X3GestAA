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


namespace WordAddIn
{
    public partial class Credentials : Form
    {
        private string userName;
        private string password;

        public Credentials()
        {
            InitializeComponent();
        }

        private void btnOk_Click_1(object sender, EventArgs e)
        {
            userName = textBoxUserName.Text;
            password = textBoxPassword.Text;
        }

        private void btnCancel_Click_1(object sender, EventArgs e)
        {
            userName = "";
            password = "";
        }

        public NetworkCredential getCredentials()
        {
            NetworkCredential nc = new NetworkCredential(userName, password);
            return nc;
        }

        public string getUserName()
        {
            return userName;
        }


    }
}
