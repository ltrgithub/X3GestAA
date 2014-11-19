using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace RegistryHelper
{
    public static class Office2010RegistryHelper
    {
        private const string _localMachineRoot = "HKEY_LOCAL_MACHINE";

        public static Boolean isOffice2010Installed()
        {
            StringBuilder keyName = new StringBuilder(_localMachineRoot);
            keyName.Append(@"\");
            keyName.Append(@"Software\Microsoft\Office\14.0\Outlook\InstallRoot");

            String valueName = "Path";
            String val = (String)Registry.GetValue(keyName.ToString(), valueName, String.Empty);

            return !String.IsNullOrEmpty(val);
        }

        public static void registerAddIn(String installDirectory)
        {
            Boolean success = registerAssembly(installDirectory);
            if (success)
            {
                removeUnusedAssembly(installDirectory);
            }
        }

        private static Boolean registerAssembly(string installDirectory)
        {
            Assembly asm = Assembly.LoadFile(installDirectory + "AdxOLNetv2s0-2010.dll");
            RegistrationServices regAsm = new RegistrationServices();
            return regAsm.RegisterAssembly(asm, AssemblyRegistrationFlags.SetCodeBase);
        }

        private static void removeUnusedAssembly(String installDirectory)
        {
            System.IO.File.Delete(installDirectory + "AdxOLNetv2s0-2013.dll");
        }
    }
}
