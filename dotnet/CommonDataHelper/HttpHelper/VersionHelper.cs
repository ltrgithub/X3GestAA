using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Win32;

namespace CommonDataHelper
{
    public class VersionHelper
    {
        private static int _versionNumberBinary = 0;

        public static int versionNumberBinary
        {
            get { return _versionNumberBinary; }
            set { _versionNumberBinary = value; }
        }

        public static string getInstalledAddinVersion()
        {
            String addinVersion = "0.0.0";
            RegistryKey regLM = Registry.LocalMachine;
            RegistryKey installerProductKey = regLM.OpenSubKey("SOFTWARE\\Classes\\Installer\\Products");
            foreach (string subKeyName in installerProductKey.GetSubKeyNames())
            {
                using (RegistryKey sk = installerProductKey.OpenSubKey(subKeyName))
                {
                    foreach (string valueName in sk.GetValueNames())
                    {
                        if (valueName == "ProductName")
                        {
                            if (sk.GetValue(valueName).ToString() == "Sage ERP X3 Office Addins")
                            {
                                Object decVersion = sk.GetValue("Version");
                                int v = Convert.ToInt32(decVersion.ToString());
                                versionNumberBinary = v;
                                String vr = ((v & 0xFF000000) >> 24) + "." + ((v & 0x00FF0000) >> 16) + "." + (v & 0x0000FFFF);
                                addinVersion = vr;
                                break;
                            }
                        }
                    }
                    sk.Close();
                }
            }

            installerProductKey.Close();
            regLM.Close();
            return addinVersion;
        }

    }
}
