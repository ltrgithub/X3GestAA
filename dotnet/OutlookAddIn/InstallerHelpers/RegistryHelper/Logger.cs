using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Runtime.InteropServices;

namespace RegistryHelper
{
    class Logger
    {
        public static void _log(string logText)
        {
            string _file = Path.GetTempPath() + "\\" + "OutlookAddin.log";
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
