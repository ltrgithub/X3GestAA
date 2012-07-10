using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.Office.Tools;

namespace ExcelAddIn
{
    public partial class Ribbon
    {
        ActionPanel actionPanel = new ActionPanel();
        CustomTaskPane taskPane;

        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
            taskPane = Globals.ThisAddIn.CustomTaskPanes.Add(actionPanel, "Sage ERP X3");
            taskPane.Visible = true;
            checkBox1.Checked = true;
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
            taskPane.Visible = checkBox1.Checked;
        }

        private void buttonPublish_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.SaveDocumentToSyracuse();
        }
    }
}
