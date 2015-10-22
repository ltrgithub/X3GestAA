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
            if (args.Length > 1 && String.IsNullOrEmpty(args[1]) == false)
            {
                String installDirectory = args[1].Trim(System.IO.Path.GetInvalidPathChars());
                if (Office2010RegistryHelper.isOffice2010Installed())
                {
                    Office2010RegistryHelper.registerAddIn(installDirectory);
                }
                else if (Office2013RegistryHelper.isOffice2013Installed())
                {
                    Office2013RegistryHelper.registerAddIn(installDirectory);
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
