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
    public partial class ServerSettings : Form
    {
        public ServerSettings()
        {
            InitializeComponent();
        }

        internal string GetConnectUrl()
        {
            return textBoxServerAddress.Text;
        }

        private void ServerSettings_Load(object sender, EventArgs e)
        {
            textBoxServerAddress.Text = (new SyracuseCustomData()).GetCustomDataByName("serverUrlAddress");
            // TEMP
            if (textBoxServerAddress.Text == "")
                textBoxServerAddress.Text = "http://localhost:8124";
        }
    }
}
