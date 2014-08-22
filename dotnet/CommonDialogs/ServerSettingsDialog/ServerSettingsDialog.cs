using System;
using System.Windows.Forms;
using System.IO;

namespace CommonDialogs.ServerSettingsDialog
{
    public partial class ServerSettingsDialog : Form, IServerSettingsDialog
    {
        public ServerSettingsDialog()
        {
            InitializeComponent();
        }

        public string BaseUrl
        {
            get { return textBoxServerAddress.Text; }
            set { textBoxServerAddress.Text = value; }
        }

        private void textBoxServerAddress_TextChanged(object sender, EventArgs e)
        {
            Uri baseUrl = null;

            if (string.IsNullOrEmpty(textBoxServerAddress.Text))
            {
                button1.Enabled = false;
            }
            else
            {
                try
                {
                    baseUrl = new Uri(textBoxServerAddress.Text);
                    button1.Enabled = true;
                }
                catch (Exception)
                {
                    /*
                     * We've entered an invalid base URL, so disable the OK button.
                     */
                    button1.Enabled = false;
                }
            }
        }

        private void ServerSettingsDialog_Load(object sender, EventArgs e)
        {
            textBoxServerAddress_TextChanged(null, null);
        }
   }
}


