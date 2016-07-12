using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Drawing;
using System.Text;
using System.Windows.Forms;

namespace RegistryHelper
{
    public partial class UpdateRegistryForm : Form
    {
        public UpdateRegistryForm()
        {
            InitializeComponent();
        }

        private void UpdateRegistryForm_Load(object sender, EventArgs e)
        {
            string[] args = Environment.GetCommandLineArgs();
            if (args.Length > 2 && String.IsNullOrEmpty(args[2]) == false)
            {
                String installDirectory = args[2].Trim(System.IO.Path.GetInvalidPathChars());
                Boolean install = String.IsNullOrEmpty(args[1]) == false && args[1].Trim().Equals("install");
                
                if (Office2016RegistryHelper.isOffice2016Installed())
                {
                    Office2016RegistryHelper.registerAddIn(installDirectory, install);
                }
                else if (Office2013RegistryHelper.isOffice2013Installed())
                {
                    Office2013RegistryHelper.registerAddIn(installDirectory, install);
                }
                else if (Office2010RegistryHelper.isOffice2010Installed())
                {
                    Office2010RegistryHelper.registerAddIn(installDirectory, install);
                }
            }
            waitTimer.Start();
        }

        private void waitTimer_Tick(object sender, EventArgs e)
        {
            Close();
        }
    }
}
