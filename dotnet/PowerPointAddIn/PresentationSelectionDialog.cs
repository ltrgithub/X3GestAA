using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Core;
using System.Threading;
using System.Globalization;
using Microsoft.Win32;

namespace PowerPointAddIn
{
    public partial class PresentationSelectionDialog : Form
    {
        public DocumentWindow selectedWindow;
        List<DocumentWindow> windows;

        public PresentationSelectionDialog(List<DocumentWindow> windows)
        {
            setLanguage();
            InitializeComponent();
            this.windows = windows;

            foreach (DocumentWindow w in windows)
            {
                listWindows.Items.Add(w.Presentation.Name);
            }

            listWindows.SelectedIndex = 0;
        }

        private void buttonOk_Click(object sender, EventArgs e)
        {
            if (listWindows.SelectedIndex < 0)
            {
                
            }
            selectedWindow = windows[listWindows.SelectedIndex];
        }

        private void buttonCancel_Click(object sender, EventArgs e)
        {
        }

        private void listWindows_DoubleClick(object sender, EventArgs e)
        {
            if (listWindows.SelectedIndex < 0)
            {

            }
        }

        private void listWindows_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (listWindows.SelectedIndex < 0)
            {
                buttonOk.Enabled = false;
            }
            else
            {
                buttonOk.Enabled = true;
            }
        }

        public int getSlideIndex()
        {
            if (radioButtonFirst.Checked)
                return -1;
            if (radioButtonLast.Checked)
                return 1;
            return 0;
        }

        private void PresentationSelectionDialog_Load(object sender, EventArgs e)
        {
        }

        // Equal function for Excel / Word / Powerpoint
        private void setLanguage()
        {
            int languageCode = 0;
            const string keyEntry = "UILanguage";
            // 15.0 Office 2013
            // 14.0 2010
            // 12.0 2003
            string[] versions = { "15.0", "14.0", "12.0" };
            foreach (string version in versions)
            {
                string reg = @"Software\Microsoft\Office\" + version + "\\Common\\LanguageResources";
                try
                {
                    RegistryKey k = Registry.CurrentUser.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageCode = (int)k.GetValue(keyEntry);

                }
                catch { }

                try
                {
                    RegistryKey k = Registry.LocalMachine.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageCode = (int)k.GetValue(keyEntry);
                }
                catch { }

                if (languageCode > 0)
                {
                    break;
                }
            }

            if (languageCode > 0)
            {
                Thread.CurrentThread.CurrentUICulture = new CultureInfo(languageCode);
            }
            else
            {
                Thread.CurrentThread.CurrentUICulture = CultureInfo.InstalledUICulture;
            }

            return;
        }
    }
}
