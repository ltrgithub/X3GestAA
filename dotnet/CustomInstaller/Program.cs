﻿using System;
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
            if (RegistryHelper.Office2013RegistryHelper.isOffice2013Installed())
            {
                if (args.Length > 0)
                    _log("Action: " + args[0]);
                if (args.Length > 0 && args[0] == "Install")
                {
                    Office2013RegistryHelper.copyAddinsRegistry();
                    Office2013RegistryHelper.copyFile();
                }
                else if (args.Length > 0 && args[0] == "Remove")
                {
                    Office2013RegistryHelper.removeAddinRegistry();
                }
            }
            else
            {
                _log("Office 2013 64bit not found");
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
