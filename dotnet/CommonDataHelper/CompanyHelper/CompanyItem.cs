using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.CompanyHelper
{
    public class CompanyItem
    {
        private string _description;
        private string _uuid;

        public CompanyItem(string description, string uuid)
        {
            _description = description;
            _uuid = uuid;
        }

        public string Description
        {
            get { return _description; }
        }

        public string Uuid
        {
            get { return _uuid; }
        }
    }
}
