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
    public partial class ServerSettings : Form
    {
        public ServerSettings(String connectUrl)
        {
            InitializeComponent();

            if (connectUrl != null)
            {
                textBoxServerAddress.Text = connectUrl;
            }
        }

        internal string GetConnectUrl()
        {
            return textBoxServerAddress.Text;
        }

        private void ServerSettings_Load(object sender, EventArgs e)
        {
            //textBoxServerAddress.Text = "http://localhost:8124";
        }
    }
}
