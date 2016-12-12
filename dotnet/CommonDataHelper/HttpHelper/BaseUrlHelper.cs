using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;
using System.Windows.Forms;
using System.Diagnostics;
using CommonDataHelper.HttpHelper;

namespace CommonDataHelper
{
    public class BaseUrlHelper
    {
        private static Uri _baseUrl = null;
        private static Boolean _showActionPanel;
        public static Boolean ShowActionPanel
        {
            get 
            {
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
                        if (!PrefUrlHelper.getBaseUrlsFromUserPreferenceFile.Contains(baseUrl))
                        {
                            PrefUrlHelper.getBaseUrlsFromUserPreferenceFile.Add(baseUrl);
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
            if (PrefUrlHelper.getBaseUrlsFromUserPreferenceFile.Count == 0)
            {
                List<Uri> uriList = PrefUrlHelper.getBaseUrlsFromUserPreferenceFile;
                _showActionPanel = HttpHelper.PrefUrlHelper.readUserPreferenceFile(ref uriList);
            }
        }

        private static Uri getBaseUrlFromUserPreferenceFile()
        {
            loadPreferencesList();
            Uri uri;
            if (PrefUrlHelper.getBaseUrlsFromUserPreferenceFile.Count > 0)
                uri = PrefUrlHelper.getBaseUrlsFromUserPreferenceFile[0];
            else
                uri = new Uri("http://localhost:8124");

            return uri;
        }

        private static void saveUrlPreference(Uri url)
        {
            if (!url.ToString().EndsWith("/"))
            {
                url = new Uri(url + "/");
            }
            if (url.Equals(@"http://localhost:8124"))
            {
                return;
            }

            String path = HttpHelper.PrefUrlHelper.getPreferenceFilePath();
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
            String path = HttpHelper.PrefUrlHelper.getPreferenceFilePath();
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
