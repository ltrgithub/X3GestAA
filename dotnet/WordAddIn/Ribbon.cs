using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.Office.Tools;
using System.Threading;
using System.Globalization;

namespace WordAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
 
        }

        private void buttonConnect_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.connect();
        }

        private void buttonServerSettings_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.serverSettings();
        }

        private void buttonCreateMailMerge_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.CreateMailMerge();
        }
    }
}
