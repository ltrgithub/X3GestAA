using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;
using System.Runtime.InteropServices;

namespace RegistryHelper
{
    class Program
    {       
        static void Main(string[] args)
        {
            if (RegistryHelper.OfficeRegistryHelper.isOffice2010Installed() || RegistryHelper.OfficeRegistryHelper.isOffice2013Installed() || RegistryHelper.OfficeRegistryHelper.isOffice2016Installed())
            {
                if (args.Length > 0)
                    _log("Action: " + args[0]);
                if (args.Length > 0 && args[0] == "Install")
                {
                    OfficeRegistryHelper.copyAddinsRegistry();
                    OfficeRegistryHelper.copyFile();
                }
                else if (args.Length > 0 && args[0] == "Remove")
                {
                    OfficeRegistryHelper.removeAddinRegistry();
                }
            }
            else
            {
                _log("Office 2010/2013/2016 64bit not found");
            }
        }

        public static void _log(string logText)
        {
            string _file = Path.GetTempPath() + "\\" + "OfficeAddin.log";
            StreamWriter swr = null;

            if (!File.Exists(_file))
            {
                swr = File.CreateText(_file);
            }
            else
            {
                swr = File.AppendText(_file);
            }

            swr.WriteLine(DateTime.Now.ToString() + " - " + logText);
            swr.Flush();
            swr.Close();
        }
    }
}
