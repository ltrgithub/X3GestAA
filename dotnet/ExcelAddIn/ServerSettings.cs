using System;
using System.Windows.Forms;
using System.IO;

namespace ExcelAddIn
{
    public partial class ServerSettings : Form
    {
        private string serverUrl;

        public ServerSettings()
        {
            InitializeComponent();
        }

        internal string GetConnectUrl()
        {
            Globals.ThisAddIn.SetPrefUrl(textBoxServerAddress.Text);
            return textBoxServerAddress.Text;
        }

        public ServerSettings(string serverUrl)
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
            textBoxServerAddress.Text = (new SyracuseCustomData(Globals.ThisAddIn.Application.ActiveWorkbook)).GetCustomDataByName("serverUrlAddress");
            if (textBoxServerAddress.Text == "")
            {
                textBoxServerAddress.Text = Globals.ThisAddIn.GetPrefUrl();
                if (textBoxServerAddress.Text == "")
                    textBoxServerAddress.Text = "http://localhost:8124";
            }
        }

        internal string GetPreferenceFilePath()
        {
            return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "\\Microsoft\\Office\\Word.X3.settings";
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
