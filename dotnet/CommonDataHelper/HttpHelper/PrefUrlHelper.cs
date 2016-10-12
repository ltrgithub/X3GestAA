using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

namespace CommonDataHelper.HttpHelper
{
    public class PrefUrlHelper
    {
        public static Boolean readUserPreferenceFile(ref List<Uri> prefUrls, String preferenceFilePath = null)
        {
            String path = preferenceFilePath == null ? getPreferenceFilePath() : preferenceFilePath;
            prefUrls = prefUrls ?? new List<Uri>();
            Uri preferenceUrl = null;
            prefUrls.Clear();
            Boolean showActionPanel = false;

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
                            prefUrls.Add(preferenceUrl);
                        }
                        catch (Exception)
                        {
                        }
                    }
                    else if (sContent.Equals("Show=True"))
                    {
                        showActionPanel = true;
                    }
                }
                preferencesFile.Close();
            }
            else
            {
                preferenceUrl = new Uri(@"http://localhost:8124");
                prefUrls.Add(preferenceUrl);
            }

            return showActionPanel;
        }

        public static void updateUserPreferenceFile(List<Uri> uriList, String preferenceFilePath)
        {
            if (File.Exists(preferenceFilePath))
            {
                string tempFile = Path.GetTempFileName();
                using (StreamReader reader = new StreamReader(preferenceFilePath, System.Text.Encoding.Default))
                {
                    using (StreamWriter writer = new StreamWriter(tempFile))
                    {
                        string sContent;
                        while ((sContent = reader.ReadLine()) != null)
                        {
                            if (sContent.Substring(0, 4).Equals("Url="))
                                continue;

                            writer.WriteLine(sContent);
                        }

                        uriList.ForEach(delegate (Uri uri)
                        {
                            sContent = "Url=" + uri.ToString();
                            writer.WriteLine(sContent);
                        });

                        writer.Close();
                        reader.Close();

                        File.Delete(preferenceFilePath);
                        File.Move(tempFile, preferenceFilePath);
                    }
                }
            }
        }

        public static string getPreferenceFilePath()
        {
            return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "\\Microsoft\\Office\\" + Process.GetCurrentProcess().ProcessName + ".X3.settings";
        }

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
    }
}
