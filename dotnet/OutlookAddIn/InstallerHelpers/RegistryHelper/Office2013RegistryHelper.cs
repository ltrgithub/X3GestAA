﻿using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Permissions;
using System.Text;

namespace RegistryHelper
{
    public static class Office2013RegistryHelper
    {
        private const string _userRoot = "HKEY_CURRENT_USER";
        private const string _localMachineRoot = "HKEY_LOCAL_MACHINE";

        public static Boolean isOffice2013Installed()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\15.0\Outlook");

            String valueName = "Bitness";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);
            return !String.IsNullOrEmpty(val);
        }

        public static Boolean isOffice32Bit()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\15.0\Outlook");

            String valueName = "Bitness";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            return val.Equals("x86");
        }

        public static void registerAddIn(String installDirectory)
        {
            enableContactsField();
            Boolean success = registerAssembly(installDirectory);
            if (success)
            {
                removeUnusedAssembly(installDirectory);
            }
        }
        
        [SecurityPermission(SecurityAction.Demand)]
        private static Boolean registerAssembly(string installDirectory)
        {
            /*
             * We need to determine the correct regasm to use here.
             * If the installed version of Outlook is 32-bit, we need to register the add-in using
             * the framework 32 version of regasm.exe. 
             * Otherwise, use the framework 64 version of regasm.exe.
             */

            string frameworkDir;
            if (isOffice32Bit())
            {
                frameworkDir = Environment.GetEnvironmentVariable("windir") + @"\Microsoft.NET\Framework\v2.0.50727";
            }
            else
            {
                frameworkDir = Environment.GetEnvironmentVariable("windir") + @"\Microsoft.NET\Framework64\v2.0.50727";
            }

            string regasmPath = frameworkDir + @"\regasm.exe";
            string componentPath = installDirectory + "AdxOLNetv2s0-2013.dll";

            Process p = new Process();
            p.StartInfo.FileName = regasmPath;
            p.StartInfo.Arguments = "\"" + componentPath + "\" /codebase";
            p.StartInfo.Verb = "runas"; // To run as administrator.
            p.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
            p.Start();
            p.WaitForExit();

            return true;
        }

        private static void enableContactsField ()
        {
            StringBuilder keyName = new StringBuilder(_userRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\15.0\Outlook\Preferences");

            String valueName = "ShowContactFieldObsolete";

            int val = (int) Registry.GetValue(keyName.ToString(), valueName, -1);
            if (val == -1 )
            {
                Registry.SetValue(keyName.ToString(), valueName, 1, RegistryValueKind.DWord);
            }
        }

        private static void removeUnusedAssembly(String installDirectory)
        {
            System.IO.File.Delete(installDirectory + @"\AdxOLNetv2s0-2010.dll");
        }
    }
}
