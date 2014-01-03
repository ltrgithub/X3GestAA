using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Threading;

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
            Globals.ThisAddIn.SetPrefUrl(textBoxServerAddress.Text);
            return textBoxServerAddress.Text;
        }

        private void ServerSettings_Load(object sender, EventArgs e)
        {
            textBoxServerAddress.Text = (new SyracuseCustomData(Globals.ThisAddIn.Application.ActiveWorkbook)).GetCustomDataByName("serverUrlAddress");
            textBoxServerAddress.Text = Globals.ThisAddIn.GetPrefUrl();
            // TEMP
            if (textBoxServerAddress.Text == "")
                textBoxServerAddress.Text = "http://localhost:8124";
        }
   }
}
