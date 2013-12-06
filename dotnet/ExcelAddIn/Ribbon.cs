using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.Office.Tools;
using System.Threading;
using System.Globalization;
using System.Windows.Forms;

namespace ExcelAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
            Globals.ThisAddIn.ReadPreferences();
            checkBox1.Checked = Globals.ThisAddIn.GetPrefShowPanel();
            installedVersion.Label = Globals.ThisAddIn.getInstalledAddinVersion();
        }

        private void checkBoxShowPane_Click(object sender, RibbonControlEventArgs e)
        {
        }

        private void btSyraPublish_Click(object sender, RibbonControlEventArgs e)
        {

        }

        private void buttonConnect_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.Connect();
        }

        private void buttonServer_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.SetupServerUrl();
        }

        private void buttonSettings_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.ShowSettingsForm();
        }

        private void buttonRefreshAll_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.RefreshAll();
        }

        private void checkBox1_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.ShowActionPanel(checkBox1.Checked);
        }

        private void buttonPublish_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.SaveDocumentToSyracuse();
        }

        private void button1_Click(object sender, RibbonControlEventArgs e)
        {
            // TEST BUTTON: to be deleted
            Globals.ThisAddIn.BrowseDocuments("SI_TEMPLATES");
        }

        private void button2_Click(object sender, RibbonControlEventArgs e)
        {
            // TEST BUTTON: to be deleted
            Globals.ThisAddIn.BrowseDocuments("SI_REPORTS");
        }

        private void button3_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.SISettings();
        }
 /*       private void ActionPanel_VisibleChanged(object sender, EventArgs e)
        {
            Microsoft.Office.Tools.CustomTaskPane taskPane = sender as Microsoft.Office.Tools.CustomTaskPane;
            if (taskPane != null)
            {
                Globals.Ribbons.Ribbon.checkBox1.Checked = taskPane.Visible;
            }
            else
            {
                Globals.Ribbons.Ribbon.checkBox1.Checked = false;
            }
            Globals.ThisAddIn.SetPrefShowPanel(taskPane.Visible);
        }
*/
        private void buttonUpdate_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.ActionPanel.updateAddin();
        }
    }
}
