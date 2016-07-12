using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Win32;
using System.ComponentModel;
using System.IO;

namespace RegistryHelper
{
    public class OfficeRegistryHelper
    {
        private const string _localMachineRoot = "HKEY_LOCAL_MACHINE";

        public static Boolean isOffice2010Installed()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\14.0\Common\ProductVersion");

            String valueName = "LastProduct";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            RegistryHelper.Program._log("LastProduct " + val);

            return !String.IsNullOrEmpty(val);
        }

        public static Boolean isOffice2013Installed()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\15.0\Common\ProductVersion");

            String valueName = "LastProduct";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            RegistryHelper.Program._log("LastProduct " + val);

            return !String.IsNullOrEmpty(val);
        }

        public static Boolean isOffice2016Installed()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\16.0\Excel\InstallRoot");

            /*
             * The registry structure is different for Office 2016, so we'll 
             * just check for the presence of the the Excel Path string.
             */
            String valueName = "Path";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            RegistryHelper.Program._log("LastProduct " + val);

            return !String.IsNullOrEmpty(val);
        }

        public static Boolean isOffice2013ClickToRunInstalled(out String officeVersionNumber)
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"SOFTWARE\Microsoft\Office\15.0\Common\InstallRoot\Virtual");

            String valueName = "VirtualExcel";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            RegistryHelper.Program._log("VirtualExcel " + val);

            if (String.IsNullOrEmpty(val))
            {
                officeVersionNumber = String.Empty;
                return false;
            }
            else
            {
                officeVersionNumber = "15.0";
                return true;
            }
        }

        public static Boolean isOffice2016ClickToRunInstalled(out String officeVersionNumber)
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\16.0\Common\InstallRoot\Virtual");

            String valueName = "VirtualExcel";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            RegistryHelper.Program._log("VirtualExcel " + val);

            if (String.IsNullOrEmpty(val))
            {
                officeVersionNumber = String.Empty;
                return false;
            }
            else
            {
                officeVersionNumber = "16.0";
                return true;
            }
        }

        public static void copyAddinsRegistry(bool clickToRun, String officeVersionNumber)
        {
            RegistryHelper.Program._log("copyAddinsRegistry");
            string[] _application = { "Word", "Excel", "PowerPoint" };

            foreach (string _app in _application)
            {
                string regSrc = @"HKEY_LOCAL_MACHINE\Software\Wow6432Node\Microsoft\Office\" + _app + @"\Addins\Sage.Syracuse." + _app + "AddIn";
                string regDest = String.Empty;
                if (clickToRun)
                {
                    regDest = @"HKEY_LOCAL_MACHINE\Software\Microsoft\Office\" +
                                officeVersionNumber +
                                @"\ClickToRun\REGISTRY\MACHINE\Software\Microsoft\Office\" +
                                _app +
                                @"\Addins\Sage.Syracuse." + _app + "AddIn";
                }
                else
                {
                    regDest = @"HKEY_LOCAL_MACHINE\Software\Microsoft\Office\" + _app + @"\Addins\Sage.Syracuse." + _app + "AddIn";
                }

                string[] _valueNames = { "Description", "FriendlyName", "Manifest" };
                string[] _values = { "valDescription", "valFriendlyName", "valManifest" };
                RegistryHelper.Program._log("search registry values for " + regSrc);
                for (int i = 0; i < _valueNames.Length; i++)
                {
                    _values[i] = (string)Registry.GetValue(regSrc, _valueNames[i], null);
                    if (String.IsNullOrEmpty(_values[i]))
                    {
                        RegistryHelper.Program._log("no value for " + _valueNames[i]);
                        return;
                    }
                    else
                    {
                        RegistryHelper.Program._log(_valueNames[i] + ": " + _values[i]);
                    }
                }
                int ergLoadBehavior = (int)Registry.GetValue(regSrc, "LoadBehavior", 0);

                RegistryHelper.Program._log("set registry values for " + regDest);
                for (int i = 0; i < _valueNames.Length; i++)
                {
                    try
                    {
                        Registry.SetValue(regDest, _valueNames[i], _values[i]);
                        RegistryHelper.Program._log("after SetValue " + _valueNames[i] + ": " + (string)Registry.GetValue(regDest, _valueNames[i], null));
                    }
                    catch (Exception e)
                    {
                        RegistryHelper.Program._log(e.Message);
                        throw new Win32Exception(e.Message);
                    }
                }
                Registry.SetValue(regDest, "LoadBehavior", ergLoadBehavior);
                RegistryHelper.Program._log("after SetValue " + "LoadBehavior" + ": " + (int)Registry.GetValue(regDest, "LoadBehavior", 0));
                RegistryHelper.Program._log("End of copyAddinsRegistry");
            }
        }

        public static void copyFile()
        {
            string _programFiles = System.Environment.GetEnvironmentVariable("ProgramFiles(x86)");
            string _sourceDir = _programFiles + @"\Sage\Sage Office Addins";
            string _targetDir = _sourceDir + @"\..\InstallHelper";
            string _file = @"\CustomInstaller.exe";
            if (!Directory.Exists(_targetDir))
            {
                try
                {
                    DirectoryInfo di = Directory.CreateDirectory(_targetDir);
                    RegistryHelper.Program._log("directory created " + _targetDir);
                }
                catch (Exception e)
                {
                    RegistryHelper.Program._log(e.ToString());
                }
            }

            try
            {
                File.Copy(_sourceDir + _file, _targetDir + _file, true);
                RegistryHelper.Program._log("file copied from " + _sourceDir + _file + " to " + _targetDir + _file);
            }
            catch (Exception e)
            {
                RegistryHelper.Program._log(e.ToString());
            }
        }

        public static void removeAddinRegistry(bool clickToRun, String officeVersionNumber)
        {
            RegistryHelper.Program._log("removeRegistry");
            string[] _application = { "Word", "Excel", "PowerPoint" };

            foreach (string _app in _application)
            {
                string keyName = String.Empty;
                if (clickToRun)
                {
                    keyName = @"Software\Microsoft\Office\" +
                            officeVersionNumber +
                            @"\ClickToRun\REGISTRY\MACHINE\Software\Microsoft\Office\" +
                            _app +
                            @"\Addins\Sage.Syracuse." + _app + "AddIn";
                }
                else
                {
                    keyName = @"Software\Microsoft\Office\" + _app + @"\Addins\Sage.Syracuse." + _app + "AddIn";
                }

                try
                {
                    Registry.LocalMachine.CreateSubKey(keyName);
                    Registry.LocalMachine.DeleteSubKeyTree(keyName);
                    RegistryHelper.Program._log("removed " + keyName);
                }
                catch (Exception e)
                {
                    RegistryHelper.Program._log("could not remove " + keyName + " - " + e.ToString());
                }
            }
            RegistryHelper.Program._log("End of removeRegistry");
        }
    }
}
