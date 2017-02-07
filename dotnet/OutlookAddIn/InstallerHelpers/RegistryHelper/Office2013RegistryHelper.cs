using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Security.Principal;
using System.Text;
using System.Windows.Forms;

namespace RegistryHelper
{
    public static class Office2013RegistryHelper
    {
        private const string _userRoot = "HKEY_CURRENT_USER";
        private const string _localMachineRoot = "HKEY_LOCAL_MACHINE";
        private const string _officeVersion = "15.0";

        public static Boolean isOffice2013Installed()
        {
            Logger._log("isOffice2013Installed");
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\15.0\Outlook");

            String valueName = "Bitness";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);
            Logger._log("val: " + val);
            return !String.IsNullOrEmpty(val);
        }

        public static Boolean isOffice32Bit()
        {
            Logger._log("isOffice32Bit");
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\15.0\Outlook");

            String valueName = "Bitness";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);
            Logger._log("val: " + val);
            return val.Equals("x86");
        }

        public static void registerAddIn(String installDirectory, Boolean install)
        {
            if (install)
                enableContactsField();

            registerAssembly(installDirectory, install);
        }

        private static void registerAssembly(string installDirectory, Boolean install)
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

            Logger._log("regasm: ");
            string regasmPath = frameworkDir + @"\regasm.exe";
            string componentPath = installDirectory + "AdxOLNetv2s0-2013.dll";

            Process p = new Process();
            p.StartInfo.FileName = regasmPath;
            p.StartInfo.Arguments = "\"" + componentPath + (install ? "\" /codebase" : "\" /unregister");
            p.StartInfo.Verb = "runas"; // To run as administrator.
            p.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
            p.Start();
            p.WaitForExit();
        }
        private static void enableContactsField()
        {
            Logger._log("enableContactsField");
            StringBuilder keyName = new StringBuilder(_userRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\15.0\Outlook\Preferences");

            String valueName = "ShowContactFieldObsolete";
            Logger._log("keyName: " + keyName.ToString());
            Logger._log("valueName: " + valueName.ToString());
            int val = System.Convert.ToInt32(Registry.GetValue(keyName.ToString(), valueName, -1));
            Logger._log("val: " + val.ToString());
            if (val == -1)
            {
                Registry.SetValue(keyName.ToString(), valueName, 1, RegistryValueKind.DWord);
            }
        }

        #region 64bit registry setting

        public static void copyAddinsRegistry()
        {
            if (!isOffice32Bit())
            {
                string regSrc = @"HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Office\Outlook\Addins\AdxOLNetv2s0.Connect";
                Logger._log("regSrc: " + regSrc);
                string regDest = @"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Office\Outlook\Addins\AdxOLNetv2s0.Connect";
                Logger._log("regDest: " + regDest);
                writeToRegistry(regSrc, regDest);
                regSrc = string.Format(@"HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Office\{0}\ClickToRun\REGISTRY\MACHINE\Software\Microsoft\Office\Outlook\Addins\AdxOLNetv2s0.Connect", _officeVersion);
                Logger._log("regSrc: " + regSrc);
                regDest = string.Format(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Office\{0}\ClickToRun\REGISTRY\MACHINE\Software\Microsoft\Office\Outlook\Addins\AdxOLNetv2s0.Connect", _officeVersion);
                Logger._log("regDest: " + regDest);
                writeToRegistry(regSrc, regDest);
            }
        }

        private static void writeToRegistry(string regSrc, string regDest)
        {
            string[] _valueNames = { "Description", "FriendlyName" };
            string[] _values = { "valDescription", "valFriendlyName" };
            Logger._log("search registry values for " + regSrc);
            for (int i = 0; i < _valueNames.Length; i++)
            {
                _values[i] = (string)Registry.GetValue(regSrc, _valueNames[i], null);
                if (String.IsNullOrEmpty(_values[i]))
                {
                    Logger._log("no value for " + _valueNames[i]);
                    return;
                }
                else
                {
                    Logger._log(_valueNames[i] + ": " + _values[i]);
                }
            }
            int ergLoadBehavior = (int)Registry.GetValue(regSrc, "LoadBehavior", 0);

            Logger._log("set registry values for " + regDest);
            for (int i = 0; i < _valueNames.Length; i++)
            {
                try
                {
                    Registry.SetValue(regDest, _valueNames[i], _values[i]);
                    Logger._log("after SetValue " + _valueNames[i] + ": " + (string)Registry.GetValue(regDest, _valueNames[i], null));
                }
                catch (Exception e)
                {
                    MessageBox.Show(e.Message);
                    throw new Win32Exception(e.Message);
                }
            }
            Registry.SetValue(regDest, "LoadBehavior", ergLoadBehavior);
            Logger._log("after SetValue " + "LoadBehavior" + ": " + (int)Registry.GetValue(regDest, "LoadBehavior", 0));
            Logger._log("End of copyAddinsRegistry");
        }

        public static void removeAddinRegistry()
        {
            Logger._log("removeRegistry");
            string keyName = @"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Office\Outlook\Addins\AdxOLNetv2s0.Connect";
            removeKeyFromRegistry(keyName);
            keyName = string.Format(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Office\{0}\ClickToRun\REGISTRY\MACHINE\Software\Microsoft\Office\Outlook\Addins\AdxOLNetv2s0.Connect", _officeVersion);
            removeKeyFromRegistry(keyName);
            Logger._log("End of removeRegistry");
        }

        private static void removeKeyFromRegistry(string keyName)
        {
            if (!isOffice32Bit())
            {
                try
                {
                    Registry.LocalMachine.CreateSubKey(keyName);
                    Registry.LocalMachine.DeleteSubKeyTree(keyName);
                    Logger._log("removed " + keyName);
                }
                catch (Exception e)
                {
                    Logger._log("could not remove " + keyName + " - " + e.ToString());
                }
            }
        }

        #endregion 64bit registry setting
    }
}
