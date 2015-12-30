using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Security.Principal;
using System.Text;


namespace RegistryHelper
{
    public static class Office2016RegistryHelper
    {
        private const string _userRoot = "HKEY_CURRENT_USER";
        private const string _localMachineRoot = "HKEY_LOCAL_MACHINE";
        private const string _officeMSI = @"\Software\Microsoft\Office\16.0\Outlook";
        private const string _officeCTR = @"\SOFTWARE\Microsoft\Office\ClickToRun\Registry\MACHINE\Software\Wow6432Node\Microsoft\Office\16.0\Outlook";  // click-to-run Installation


        public static Boolean isOffice2016Installed()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(_officeMSI);

            String valueName = "Bitness";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);
            if (String.IsNullOrEmpty(val))
            {
                keyName = new StringBuilder(_localMachineRoot);
                keyName.Append(_officeCTR);
                val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);
            }

            return !String.IsNullOrEmpty(val);
        }

        public static Boolean isOffice32Bit()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(_officeMSI);

            String valueName = "Bitness";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);
            if (String.IsNullOrEmpty(val))
            {
                keyName = new StringBuilder(_localMachineRoot);
                keyName.Append(_officeCTR);
                val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);
            }

            return val.Equals("x86");
        }

        public static void registerAddIn(String installDirectory)
        {
            enableContactsField();
            registerAssembly(installDirectory);
        }
        
        private static void registerAssembly(string installDirectory)
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
            string componentPath = installDirectory + "AdxOLNetv2s0-2016.dll";

            Process p = new Process();
            p.StartInfo.FileName = regasmPath;
            p.StartInfo.Arguments = "\"" + componentPath + "\" /codebase";
            p.StartInfo.Verb = "runas"; // To run as administrator.
            p.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
            p.Start();
            p.WaitForExit();
        }

        private static void enableContactsField ()
        {
            StringBuilder keyName = new StringBuilder(_userRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\16.0\Outlook\Preferences");

            String valueName = "ShowContactFieldObsolete";

            int val = (int) Registry.GetValue(keyName.ToString(), valueName, -1);
            if (val == -1 )
            {
                Registry.SetValue(keyName.ToString(), valueName, 1, RegistryValueKind.DWord);
            }
        }
    }
}
