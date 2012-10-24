using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.Office.Tools;
using System.Threading;
using System.Globalization;
using Word = Microsoft.Office.Interop.Word;

namespace WordAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
        }

        private void buttonSave_Click(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.Application.ActiveDocument;
            if (doc != null)
            {
                Globals.WordAddIn.commons.Save(doc);
            }
        }
        private void buttonSaveAs_Click(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.Application.ActiveDocument;
            if (doc != null)
            {
                Globals.WordAddIn.commons.SaveAs(doc);
            }
        }
        private void checkBoxShowTemplatePane_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.showReportingFieldsTaskPane(checkBoxShowTemplatePane.Checked);
        }

        private void buttonPreview_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.reporting.CreateWordReportPreview();
        }

        private void buttonRefreshReport_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.reporting.RefreshReport();
        }
    }
}
