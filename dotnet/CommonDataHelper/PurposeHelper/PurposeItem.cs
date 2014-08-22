using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.PurposeHelper
{
    public class PurposeItem
    {
        private string _name;
        private string _uuid;

        public PurposeItem(string name, string uuid)
        {
            _name = name;
            _uuid = uuid;
        }

        public string Name
        {
            get { return _name; }
        }

        public string Uuid
        {
            get { return _uuid; }
        }
    }
}
