using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.Office.Tools;
using System.Threading;
using System.Globalization;

namespace PowerPointAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
        }

        private void buttonSave_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.PowerPointAddIn.common.Save(Globals.PowerPointAddIn.Application.ActivePresentation);
        }

        private void buttonSaveAs_Click(object sender, RibbonControlEventArgs e)
        {

            Globals.PowerPointAddIn.common.SaveAs(Globals.PowerPointAddIn.Application.ActivePresentation);
        }
    }
}
