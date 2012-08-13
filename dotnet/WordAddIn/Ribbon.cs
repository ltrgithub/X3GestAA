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

        private void buttonConnect_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.Connect();
        }

        private void buttonServerSettings_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.ServerSettings();
        }

        private void buttonCreateMailMerge_Click(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.Application.ActiveDocument;
            if (doc != null)
            {
                Globals.WordAddIn.CreateMailMerge(doc);
            }
        }

        private void buttonSave_Click(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.Application.ActiveDocument;
            if (doc != null)
            {
                Globals.WordAddIn.SaveDocumentToX3(doc);
            }
        }
    }
}
