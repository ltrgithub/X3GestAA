using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.ServerSettingsDialog;
using System.IO;
using System.Windows.Forms;

namespace CommonDataHelper
{
    public class BaseUrlHelper
    {
        /*
         * We're maintaining the base URL globally for the moment.
         * This may change with Excel, as different base URLs may be required 
         * where more than one datasource is present in a worksheet.
         */
        private static Uri _baseUrl = null;
        public static Uri BaseUrl
        {
            get
            {
                if (_baseUrl == null)
                {
                    Uri baseUrl = getBaseUrlFromCustomData();

                    if (baseUrl == null)
                    {
                        baseUrl = getBaseUrlFromUserPreferenceFile();
                    }

                    if (baseUrl == null)
                    {
                        baseUrl = new Uri(@"http://localhost:8124");
                    }

                    ServerSettingsDialog serverSettingsDialog = new ServerSettingsDialog();
                    serverSettingsDialog.BaseUrl = baseUrl.ToString();

                    if (serverSettingsDialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                    {
                        _baseUrl = new Uri(serverSettingsDialog.BaseUrl);
                        saveUrlPreference(_baseUrl);
                    }

                    /*
                     * If we cancel, we return null to indicate that we're aborting the logon.
                     * This needs to be rationalised, as setting the server details and 
                     * adding credentials should really be part of the same operation...
                     */
                }
                return _baseUrl;
            }
        }

        private static ISyracuseOfficeCustomData _customData = null;
        public static ISyracuseOfficeCustomData CustomData
        {
            get { return _customData; }
            set { _customData = value; }
        }

        private static Uri getBaseUrlFromCustomData()
        {
            if (CustomData != null)
            {
                string serverUrl = CustomData.getServerUrl();
                if (serverUrl != null)
                    return new Uri(serverUrl);
            }

            return null;
        }

#region preferencefile

        private static Uri getBaseUrlFromUserPreferenceFile()
        {
            String path = getPreferenceFilePath();
            Uri preferenceUrl = null;

            if (File.Exists(path))
            {
                string sContent = string.Empty;

                StreamReader preferencesFile = new StreamReader(path, System.Text.Encoding.Default);
                while (!preferencesFile.EndOfStream)
                {
                    sContent = preferencesFile.ReadLine();
                    if (sContent.Substring(0, 4).Equals("Url="))
                    {
                        try
                        {
                            preferenceUrl = new Uri(sContent.Substring(4, sContent.Length - 4));
                        }
                        catch (Exception)
                        {
                        }
                    }
                }
                preferencesFile.Close();
            }

            return preferenceUrl;
        }
 
        private static string getPreferenceFilePath()
        {
            return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "\\Microsoft\\Office\\Word.X3.settings";
        }

        private static void saveUrlPreference(Uri url)
        {
            String path = getPreferenceFilePath();
            List<string> lines = new List<string>(System.IO.File.ReadAllLines(path));
            List<string> newLines = new List<string>();

            if (lines.Count == 0)
            {
                newLines.Add("Url=" + url.ToString());
            }
            else
            {
                foreach (string line in lines)
                {
                    if (line.StartsWith("Url="))
                    {
                        newLines.Add("Url=" + url.ToString());
                    }
                    else
                    {
                        // Don't add. As we're likely to be storing more user preferences in future, we'll need to look at this again...
                    }
                }
            }
            System.IO.File.WriteAllLines(path, newLines);
        }
    }

#endregion

}
