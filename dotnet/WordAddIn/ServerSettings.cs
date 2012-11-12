using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Threading;

namespace WordAddIn
{
    public partial class ServerSettings : Form
    {
        private string serverUrl;

        public ServerSettings(string serverUrl)
        {
            InitializeComponent();
            this.serverUrl = serverUrl;
        }

        internal string getServerUrl()
        {
            return textBoxServerAddress.Text;
        }

        private void ServerSettings_Load(object sender, EventArgs e)
        {
            textBoxServerAddress.Text = serverUrl;
            // TEMP
            if (textBoxServerAddress.Text == "")
                textBoxServerAddress.Text = "http://localhost:8124";
        }
    }
}
