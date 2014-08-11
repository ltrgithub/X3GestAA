using System;
using System.Windows.Forms;
using System.IO;

namespace CommonDialogs.ServerSettingsDialog
{
    public partial class ServerSettingsDialog : Form, IServerSettingsDialog
    {
        private string serverUrl;

        public ServerSettingsDialog()
        {
            InitializeComponent();
        }

        private Uri _baseUrl = null;
        public Uri BaseUrl
        {
            get { return _baseUrl; }
            set { _baseUrl = value; }
        }

        internal string GetConnectUrl()
        {
            //Globals.ThisAddIn.SetPrefUrl(textBoxServerAddress.Text);
            return textBoxServerAddress.Text;
        }

        public ServerSettingsDialog(string serverUrl)
        {
            InitializeComponent();
            this.serverUrl = serverUrl;
        }

        internal string getServerUrl()
        {
            SavePreferences(textBoxServerAddress.Text);
            return textBoxServerAddress.Text;
        }

        private void ServerSettings_Load(object sender, EventArgs e)
        {
            //textBoxServerAddress.Text = (new SyracuseCustomData(Globals.ThisAddIn.Application.ActiveWorkbook)).GetCustomDataByName("serverUrlAddress");
            if (textBoxServerAddress.Text == "")
            {
                //textBoxServerAddress.Text = Globals.ThisAddIn.GetPrefUrl();
                if (textBoxServerAddress.Text == "")
                    textBoxServerAddress.Text = "http://localhost:8124";
            }
        }

        internal string GetPreferenceFilePath()
        {
            return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "\\Microsoft\\Office\\Excel.X3.settings";
        }

        internal string ReadPreferences()
        {
            String path = GetPreferenceFilePath();
            string sContent = "";

            if (File.Exists(path))
            {
                StreamReader myFile = new StreamReader(path, System.Text.Encoding.Default);
                while (!myFile.EndOfStream)
                {
                    sContent = myFile.ReadLine();
                    if (sContent != "")
                    {
                        break;
                    }
                }
                myFile.Close();
            }
            return sContent;
        }

        internal void SavePreferences(String url)
        {
            String path = GetPreferenceFilePath();
            System.IO.StreamWriter file = new System.IO.StreamWriter(path);
            try
            {
                file.WriteLine(url);
            }
            catch (Exception e) { MessageBox.Show(e.Message); }
            file.Close();
        }
   }
}
