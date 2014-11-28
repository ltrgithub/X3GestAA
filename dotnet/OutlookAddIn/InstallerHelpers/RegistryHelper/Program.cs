using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RegistryHelper
{
    class Program
    {
        static void Main(string[] args)
        {
            String installDirectory = args[0].Trim(System.IO.Path.GetInvalidPathChars());

            if (Office2010RegistryHelper.isOffice2010Installed())
            {
                Office2010RegistryHelper.registerAddIn(installDirectory);
            }
            else if (Office2013RegistryHelper.isOffice2013Installed())
            {
                Office2013RegistryHelper.registerAddIn(installDirectory);
            }
        }
    }
}
