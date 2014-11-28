﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;
using System.Windows.Forms;
using System.Diagnostics;

namespace CommonDataHelper
{
    public class BaseUrlHelper
    {
        /*
         * We're maintaining the base URL globally for the moment.
         * This may change with Excel, as different base URLs may be required 
         * where more than one datasource is present in a worksheet.
         */
        private static List<Uri> _prefUrls = new List<Uri>();
        public static List<Uri> getBaseUrlsFromUserPreferenceFile
        {
            get
            {
                return _prefUrls;
            }
        }

        private static Uri _baseUrl = null;
        private static Boolean _showActionPanel;
        public static Boolean ShowActionPanel
        {
            get 
            {
                if (_showActionPanel == null)
                {
                    readUserPreferenceFile();
                }
                return _showActionPanel; 
            }
            set 
            {
                _showActionPanel = value;
                saveActionPanelPreference(_showActionPanel);
            }
        }
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
                    else
                    {
                        loadPreferencesList();
                        if (!_prefUrls.Contains(baseUrl))
                        {
                            _prefUrls.Add(baseUrl);
                        }
                    }
                    _baseUrl = baseUrl;
                    saveUrlPreference(_baseUrl);
                }
                return _baseUrl;
            }
            set 
            {
                _baseUrl = value;
                saveUrlPreference(_baseUrl);
                loadPreferencesList();
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
                if (string.IsNullOrEmpty(serverUrl))
                {
                    Uri documentUrl = getDocumentUrlFromCustomData();
                    if (documentUrl != null)
                    {
                        return new Uri(documentUrl.GetLeftPart(UriPartial.Authority));
                    }
                }
                return new Uri(serverUrl);
            }

            return null;
        }

        private static Uri getDocumentUrlFromCustomData()
        {
            if (CustomData != null)
            {
                string documentUrl = CustomData.getDocumentUrl();
                if (!string.IsNullOrEmpty(documentUrl))
                    return new Uri(documentUrl);
            }

            return null;
        }


#region preferencefile

        private static void loadPreferencesList()
        {
            if (_prefUrls.Count == 0)
            {
                readUserPreferenceFile();
            }
        }

        private static Uri getBaseUrlFromUserPreferenceFile()
        {
            loadPreferencesList();
            return _prefUrls[0];
        }

        private static void readUserPreferenceFile()
        {
            String path = getPreferenceFilePath();
            Uri preferenceUrl = null;
            _prefUrls.Clear();
            _showActionPanel = false;

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
                            _prefUrls.Add(preferenceUrl);
                        }
                        catch (Exception)
                        {
                        }
                    }
                    else if (sContent.Equals("Show=True"))
                    {
                        _showActionPanel = true;
                    }
                }
                preferencesFile.Close();
            }
            else
            {
                preferenceUrl = new Uri(@"http://localhost:8124");
                _prefUrls.Add(preferenceUrl);
            }

            return;
        }

        private static string getPreferenceFilePath()
        {
            return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "\\Microsoft\\Office\\" + Process.GetCurrentProcess().ProcessName + ".X3.settings";
        }

        private static void saveUrlPreference(Uri url)
        {
            if (url.Equals(@"http://localhost:8124"))
            {
                return;
            }

            String path = getPreferenceFilePath();
            String urlFromFile = null;
            Boolean urlExists = false;
            List<string> lines = new List<string>();
            if (File.Exists(path))
            {
                lines = new List<string>(System.IO.File.ReadAllLines(path));
                foreach (string line in lines)
                {
                    if (line.StartsWith("Url="))
                    {
                        urlFromFile = line.Substring(4);
                        if (urlFromFile.Equals(url.ToString()))
                        {
                            urlExists = true;
                            break;
                        }
                    }
                    else
                    {
                        // Don't add. As we're likely to be storing more user preferences in future, we'll need to look at this again...
                    }
                }
            }

            if (urlExists == false)
            {
                lines.Add("Url=" + url.ToString());
            }
            System.IO.File.WriteAllLines(path, lines);
        }

        private static void saveActionPanelPreference(Boolean showActionPanel)
        {
            String path = getPreferenceFilePath();
            List<string> lines = new List<string>();
            if (File.Exists(path))
            {
                lines = new List<string>(System.IO.File.ReadAllLines(path));
                int idx = lines.FindIndex(x => x.StartsWith("Show="));
                if (idx >= 0)
                {
                    lines[idx] = "Show=" + showActionPanel.ToString();
                }
                else
                {
                    lines.Add("Show=" + showActionPanel.ToString());
                }
            }
            System.IO.File.WriteAllLines(path, lines);
        }
    }

#endregion

}
