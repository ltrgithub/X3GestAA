using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.InteropServices;
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
            keyName.Append(@"Software\Microsoft\Office\15.0\Outlook\InstallRoot");

            String valueName = "Path";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            return !String.IsNullOrEmpty(val);
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

        private static Boolean registerAssembly(string installDirectory)
        {
            Assembly asm = Assembly.LoadFile(installDirectory + "AdxOLNetv2s0-2013.dll");
            RegistrationServices regAsm = new RegistrationServices();
            return regAsm.RegisterAssembly(asm, AssemblyRegistrationFlags.SetCodeBase);
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
            System.IO.File.Delete(installDirectory + "AdxOLNetv2s0-2010.dll");
        }
    }
}
