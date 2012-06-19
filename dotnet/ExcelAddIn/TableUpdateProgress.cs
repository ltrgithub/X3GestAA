using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace ExcelAddIn
{
    public partial class TableUpdateProgress : Form
    {
        public TableUpdateProgress()
        {
            InitializeComponent();
            //
            UpdateProgress(0);
        }

        private void buttonAbort_Click(object sender, EventArgs e)
        {
            Globals.ThisAddIn.Aborted = true;
        }

        public void UpdateProgress(int linesCount)
        {
            labelLoading.Text = String.Format("Loading ... {0} rows", linesCount);
        }
    }
}
